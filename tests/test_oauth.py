"""Authorization Code + real PHP sessions, with locally trusted TLS OAuth/OCS fixtures."""
import http.cookiejar
import json
import os
from pathlib import Path
import signal
import socket
import ssl
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request

from mock_ged import FakeGED, TLSFacade, serve_tls

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('ENTREGAS_PHP_BIN', 'php')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None

class OAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.base = Path(cls.tmp.name)
        cert, key = cls.base/'cert.pem', cls.base/'key.pem'
        subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1',
                        '-keyout',str(key),'-out',str(cert),'-subj','/CN=localhost',
                        '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],check=True,capture_output=True)
        tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); tls.load_cert_chain(cert, key)
        cls.context = ssl.create_default_context(cafile=str(cert))
        cls.ged = serve_tls(FakeGED, tls)
        cls.facade = serve_tls(TLSFacade, tls)
        cls.origin = f'https://127.0.0.1:{cls.facade.server_port}'
        cls.ged_origin = f'https://localhost:{cls.ged.server_port}'
        cls.ged.app_origin = cls.origin
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); cls.php_port = sock.getsockname()[1]
        cls.facade.php_port = cls.php_port
        cls.data = cls.base/'data';cls.data.mkdir()
        cls.log = tempfile.TemporaryFile()
        env = dict(os.environ, GED_AUTH_TYPE='oauth2', GED_BASE_URL=cls.ged_origin,
                   GED_CLIENT_ID='fixture-client', GED_CLIENT_SECRET='fixture-secret-only-tests',
                   GED_REDIRECT_URI=cls.origin+'/api/auth_callback.php', GED_CA_BUNDLE=str(cert),
                   ENTREGAS_PUBLIC_ORIGIN=cls.origin, ENTREGAS_DATA_DIR=str(cls.data),
                   ENTREGAS_ROLE_GROUPS='', PHP_CLI_SERVER_WORKERS='4', NO_PROXY='localhost,127.0.0.1',no_proxy='localhost,127.0.0.1')
        cls.proc = subprocess.Popen([PHP,'-S',f'127.0.0.1:{cls.php_port}','router.php'],cwd=ROOT,env=env,
                                    stdout=cls.log,stderr=cls.log,start_new_session=True)
        for _ in range(100):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{cls.php_port}/',timeout=.2).close();break
            except OSError:time.sleep(.05)
        else:raise RuntimeError('PHP TLS fixture startup failed')

    @classmethod
    def tearDownClass(cls):
        os.killpg(cls.proc.pid,signal.SIGTERM);cls.proc.wait()
        for server in (cls.ged,cls.facade):server.shutdown();server.server_close()
        cls.log.close();cls.tmp.cleanup()

    def setUp(self):
        self.ged.codes={};self.ged.tokens={};self.ged.failure=None;self.ged.exchanges=0
        self.ged.expires_in=3600;self.ged.identity_checks=0;self.ged.login_user='synthetic-operator'
        self.ged.groups={'synthetic-operator':['Logistica'],'synthetic-reader':['Financeiro'],
                         'synthetic-admin':['Diretoria'],'synthetic-none':['unrelated']}
        self.client,self.cookies=self.new_client()

    def new_client(self):
        jar=http.cookiejar.CookieJar()
        return urllib.request.build_opener(urllib.request.HTTPSHandler(context=self.context),
                                           urllib.request.HTTPCookieProcessor(jar),NoRedirect()),jar

    def request(self,path,body=None,csrf=None,origin=None,client=None,headers=None):
        h=dict(headers or {})
        if body is not None:h['Content-Type']='application/json';h['Origin']=origin or self.origin
        if csrf is not None:h['X-CSRF-Token']=csrf
        url=path if path.startswith('https://') else self.origin+path
        req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers=h)
        try:r=(client or self.client).open(req,timeout=15)
        except urllib.error.HTTPError as e:r=e
        raw=r.read()
        try:data=json.loads(raw)
        except ValueError:data=raw
        return r.code,data,r.headers

    def begin(self):
        status,_,headers=self.request('/api/auth_login.php');self.assertEqual(status,303)
        target=headers['Location'];self.assertTrue(target.startswith(self.ged_origin+'/apps/oauth2/authorize?'))
        self.assertNotIn('client_secret',target)
        return target,headers

    def login(self,user='synthetic-operator'):
        self.ged.login_user=user
        target,_=self.begin()
        code,_,headers=self.request(target);self.assertEqual(code,303)
        result=self.request(headers['Location'])
        return result

    def session(self):
        code,data,_=self.request('/api/auth_session.php');self.assertEqual(code,200,data)
        return data

    def create(self,csrf):
        code,data,_=self.request('/api/save_route.php',{'stops':[{'id':'synthetic-stop','lat':-28.2,'lon':-53.5,'status':'pending'}]},csrf)
        self.assertEqual(code,200,data);return data

    def test_login_csrf_rotation_and_local_logout(self):
        target,headers=self.begin()
        cookie=headers['Set-Cookie']
        for flag in ['Secure','HttpOnly','SameSite=Lax','path=/']:self.assertIn(flag.lower(),cookie.lower())
        old_cookie=next(iter(self.cookies)).value
        code,_,headers=self.request(target);self.assertEqual(code,303)
        callback=headers['Location']
        code,_,headers=self.request(callback);self.assertEqual(code,303);self.assertEqual(headers['Location'],self.origin+'/')
        self.assertNotEqual(next(iter(self.cookies)).value,old_cookie)
        data=self.session();self.assertTrue(data['authenticated']);self.assertEqual(data['user']['roles'],['operator'])
        csrf=data['csrf_token'];self.assertEqual(len(csrf),64)
        self.assertNotIn('access_token',data);self.assertNotIn('refresh_token',data)
        self.assertEqual(self.request('/api/save_route.php',{'stops':[]})[0],403)
        self.assertEqual(self.request('/api/save_route.php',{'stops':[]},'wrong')[0],403)
        self.assertEqual(self.request('/api/save_route.php',{'stops':[]},csrf,origin='https://evil.invalid')[0],403)
        route=self.create(csrf)
        self.assertEqual(self.request('/api/get_route.php?r='+route['route_id'])[0],200)
        self.assertEqual(self.request('/api/auth_callback.php?'+urllib.parse.urlparse(callback).query)[0],400)
        self.assertEqual(self.request('/api/auth_logout.php',{},'wrong')[0],403)
        # Local logout remains possible during a provider outage.
        self.ged.failure='identity_down'
        self.assertEqual(self.request('/api/auth_logout.php',{},csrf)[0],200)
        self.assertFalse(self.session()['authenticated'])
        self.assertEqual(self.request('/api/get_history.php')[0],401)

    def test_provider_outage_allows_local_logout_after_reload_but_no_data(self):
        self.assertEqual(self.login()[0],303)
        self.ged.failure='identity_down'
        code,data,_=self.request('/api/auth_session.php')
        self.assertEqual(code,503);self.assertFalse(data['authenticated']);self.assertTrue(data['logout_available'])
        self.assertNotIn('user',data)
        self.assertEqual(self.request('/api/get_history.php')[0],503)
        self.assertEqual(self.request('/api/auth_logout.php',{},data['csrf_token'])[0],200)
        self.assertFalse(self.session()['authenticated'])

    def test_state_mismatch_replay_cancel_and_cookie_binding(self):
        target,_=self.begin();code,_,headers=self.request(target);callback=headers['Location']
        other,_=self.new_client()
        self.assertEqual(self.request(callback,client=other)[0],400)
        query=urllib.parse.parse_qs(urllib.parse.urlparse(callback).query)
        wrong='/api/auth_callback.php?'+urllib.parse.urlencode({'code':query['code'][0],'state':'0'*64})
        self.assertEqual(self.request(wrong)[0],400);self.assertEqual(self.ged.exchanges,0)
        self.assertEqual(self.request(callback)[0],400)
        target,_=self.begin();state=urllib.parse.parse_qs(urllib.parse.urlparse(target).query)['state'][0]
        self.assertEqual(self.request('/api/auth_callback.php?'+urllib.parse.urlencode({'state':state,'error':'access_denied'}))[0],401)
        self.assertEqual(self.request('/api/auth_callback.php?'+urllib.parse.urlencode({'state':state,'code':'replay'}))[0],400)
        self.assertEqual(self.login()[0],303)

    def test_supervisor_is_read_only_and_admin_roles_are_cumulative(self):
        self.assertEqual(self.login()[0],303);route=self.create(self.session()['csrf_token'])
        self.assertEqual(self.login('synthetic-reader')[0],303)
        data=self.session();self.assertEqual(data['user']['roles'],['supervisor'])
        self.assertEqual(self.request('/api/get_history.php')[0],200)
        self.assertEqual(self.request('/api/routine_read.php')[0],200)
        self.assertEqual(self.request('/api/get_route.php?r='+route['route_id'])[0],200)
        for endpoint in ['save_route','optimize_sequence','process_danfe','revoke_route','issue_route_access','update_route_status','finish_route','routine_write']:
            body={'route_id':route['route_id'],'stop_id':'synthetic-stop','status':'delivered'}
            self.assertEqual(self.request('/api/'+endpoint+'.php',body,data['csrf_token'])[0],403,endpoint)
        for endpoint in ['search_company.php','geocode.php?q=synthetic']:
            self.assertEqual(self.request('/api/'+endpoint)[0],403)
        self.assertEqual(self.login('synthetic-admin')[0],303)
        data=self.session();self.assertEqual(data['user']['roles'],['supervisor','administrator'])
        self.create(data['csrf_token'])
        self.assertEqual(self.login('synthetic-none')[0],403)
        self.assertFalse(self.session()['authenticated'])

    def test_revalidation_revocation_and_no_provider_fallback(self):
        self.assertEqual(self.login()[0],303)
        self.ged.groups['synthetic-operator']=['Financeiro']
        data=self.session();self.assertEqual(data['user']['roles'],['supervisor'])
        self.assertEqual(self.request('/api/save_route.php',{},data['csrf_token'])[0],403)
        self.ged.failure='identity_down'
        self.assertEqual(self.request('/api/get_history.php')[0],503)
        self.ged.failure=None;self.ged.tokens.clear()
        self.assertEqual(self.request('/api/get_history.php')[0],401)
        self.assertFalse(self.session()['authenticated'])
        # Browser-controlled pseudo-gateway headers cannot authenticate in oauth2 mode.
        self.assertEqual(self.request('/api/get_history.php',headers={'X-Remote-User':'admin','X-Remote-Groups':'admin','X-Test-Identity':'operator'})[0],401)

    def test_provider_errors_do_not_create_authenticated_sessions(self):
        for failure in ['token_down','ocs_failure','wrong_user','bad_groups','redirect']:
            self.ged.failure=failure
            status,_,_=self.login()
            self.assertIn(status,[401,503],failure)
            self.assertFalse(self.session()['authenticated'])
        self.ged.failure=None
        self.assertEqual(self.login()[0],303)

    @unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in Chromium OAuth regression')
    def test_https_browser_login_and_logout(self):
        import hashlib,base64
        pub=subprocess.run(['openssl','x509','-in',str(self.base/'cert.pem'),'-pubkey','-noout'],capture_output=True,check=True).stdout
        der=subprocess.run(['openssl','pkey','-pubin','-outform','DER'],input=pub,capture_output=True,check=True).stdout
        pin=base64.b64encode(hashlib.sha256(der).digest()).decode()
        for user,read_only in [('synthetic-operator','0'),('synthetic-reader','1')]:
            self.ged.login_user=user
            subprocess.run(['node',str(ROOT/'tests/oauth-browser.cjs')],cwd=ROOT,
                env=dict(os.environ,TEST_APP=self.origin,TEST_GED=self.ged_origin,TEST_CERT_SPKI=pin,TEST_READ_ONLY=read_only),check=True,timeout=60)

    def test_expired_access_token_expires_local_session(self):
        self.ged.expires_in=1
        self.assertEqual(self.login()[0],303)
        time.sleep(1.1)
        self.assertEqual(self.request('/api/get_history.php')[0],401)
        self.assertFalse(self.session()['authenticated'])

if __name__=='__main__':unittest.main()
