"""Offline integration against PHP worker processes and synthetic data only."""
import concurrent.futures
import contextlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('ENTREGAS_PHP_BIN', 'php')

class API(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.data = Path(cls.tmp.name) / 'data'
        cls.data.mkdir()
        # Gateway simulation is restricted to this test router, outside the checkout and static root.
        router = Path(cls.tmp.name) / 'router.php'
        router.write_text("<?php if (($_SERVER['HTTP_X_TEST_IDENTITY']??'')==='operator') { $_SERVER['REMOTE_USER']='synthetic'; $_SERVER['REMOTE_GROUPS']='test-dispatch'; } elseif (($_SERVER['HTTP_X_TEST_IDENTITY']??'')==='reader') { $_SERVER['REMOTE_USER']='synthetic-reader'; $_SERVER['REMOTE_GROUPS']='test-supervise'; } elseif (($_SERVER['HTTP_X_TEST_IDENTITY']??'')==='denied') { $_SERVER['REMOTE_USER']='synthetic'; $_SERVER['REMOTE_GROUPS']='other'; } return require " + repr(str(ROOT / 'router.php')) + ';')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); cls.port = sock.getsockname()[1]
        cls.origin = f'http://127.0.0.1:{cls.port}'
        env = dict(os.environ, ENTREGAS_DATA_DIR=str(cls.data), ENTREGAS_PUBLIC_ORIGIN=cls.origin,
                   ENTREGAS_ROLE_GROUPS='{"operator":["test-dispatch"],"supervisor":["test-supervise"]}', PHP_CLI_SERVER_WORKERS='4')
        companies=Path(cls.tmp.name)/'companies.json'
        companies.write_text(json.dumps([{'id':'synthetic-company','nome':'Synthetic Company','fantasia':'Synthetic','logradouro':'Synthetic Street','lat':-28.2,'lon':-53.5}]))
        env['ENTREGAS_COMPANIES_FILE']=str(companies)
        cls.log = tempfile.TemporaryFile()
        cls.proc = subprocess.Popen([PHP, '-S', f'127.0.0.1:{cls.port}', str(router)], cwd=ROOT, env=env,
                                    stdout=cls.log, stderr=cls.log, start_new_session=True)
        for _ in range(100):
            try:
                urllib.request.urlopen(cls.origin + '/', timeout=.2).close(); break
            except OSError:
                time.sleep(.05)
        else:
            cls.log.seek(0); raise RuntimeError(cls.log.read().decode())

    @classmethod
    def tearDownClass(cls):
        import signal
        os.killpg(cls.proc.pid, signal.SIGTERM); cls.proc.wait(); cls.log.close(); cls.tmp.cleanup()

    def call(self, endpoint, body=None, identity='operator', token=None, raw=None, origin=None):
        headers = {'Content-Type':'application/json', 'Origin': origin or self.origin}
        if identity: headers['X-Test-Identity'] = identity
        if token: headers['Authorization'] = 'Bearer ' + token
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(self.origin + endpoint, data=data, headers=headers)
        try: response = urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as e: response = e
        content = response.read()
        try: value = json.loads(content)
        except ValueError: value = content
        return response.status, value

    def create(self):
        stops = [{'id':'synthetic-a','lat':-28.2,'lon':-53.5,'status':'pending','destinatario':'Synthetic'},
                 {'id':'synthetic-b','lat':-28.3,'lon':-53.4,'status':'pending'}]
        status, r = self.call('/api/save_route.php', {'stops':stops})
        self.assertEqual(status, 200, r)
        return r['route_id'], r['share_url'].split('#token=')[1]

    def test_authorization_and_private_files(self):
        for endpoint in ['get_history.php','search_company.php','geocode.php?q=abc']:
            self.assertEqual(self.call('/api/'+endpoint, identity=None)[0],401)
        self.assertEqual(self.call('/api/get_history.php',identity='denied')[0],403)
        for path in ['/api/companies_db.json','/api/config.php','/data/routes_history.json','/.git/config','/api/.env','/server.py','/api/runtime.php','/%2e%2e/README.md']:
            self.assertEqual(self.call(path,identity=None)[0],404,path)
        self.assertEqual(self.call('/api/save_route.php',{},origin='https://evil.invalid')[0],403)
        for endpoint in ['save_route','optimize_sequence','process_danfe','revoke_route','issue_route_access']:
            self.assertEqual(self.call('/api/'+endpoint+'.php',{},identity=None)[0],401)
        r,t=self.create()
        self.assertEqual(self.call('/api/get_route.php?r='+r,identity=None)[0],401)
        code,value=self.call('/api/get_route.php?r='+r,identity=None,token=t)
        self.assertEqual(code,200); self.assertNotIn('_driver',value['route'])
        self.assertEqual(self.call('/api/get_route.php?r='+r,identity=None,token='0'*64)[0],403)
        docpath=self.data/'routes'/(r+'.json'); doc=json.loads(docpath.read_text());doc['_driver']['expires_at']=0;docpath.write_text(json.dumps(doc))
        self.assertEqual(self.call('/api/get_route.php?r='+r,identity=None,token=t)[0],403)
        r,t=self.create()
        _,issued=self.call('/api/issue_route_access.php',{'route_id':r})
        self.assertEqual(self.call('/api/get_route.php?r='+r,identity=None,token=t)[0],403)
        t=issued['share_url'].split('#token=')[1]
        self.assertEqual(self.call('/api/get_route.php?r='+r,identity=None,token=t)[0],200)
        self.call('/api/revoke_route.php',{'route_id':r})
        self.assertEqual(self.call('/api/get_route.php?r='+r,identity=None,token=t)[0],403)

    def test_catalog_and_optimization(self):
        code,result=self.call('/api/search_company.php?q=Synthetic')
        self.assertEqual(code,200);self.assertEqual(result['count'],1)
        code,result=self.call('/api/optimize_sequence.php',{'stops':[
            {'id':'far','lat':-29,'lon':-54,'version':3},
            {'id':'near','lat':-28.2745,'lon':-53.5182,'version':2}]})
        self.assertEqual(code,200);self.assertEqual(result['ordered_stops'][0]['id'],'near')
        self.assertEqual(result['ordered_stops'][0]['version'],2)

    def test_invalid_inputs(self):
        for raw in [b'{', b'[]', b'null', b'"text"']:
            self.assertEqual(self.call('/api/save_route.php',raw=raw)[0],400)
        for stops in [[],{},[{}],[{'id':'x','lat':100,'lon':0}], [{'id':"x' onclick='",'lat':0,'lon':0}]]:
            self.assertEqual(self.call('/api/save_route.php',{'stops':stops})[0],400)
        self.assertEqual(self.call('/api/get_route.php?r=../ROT-AAAA')[0],400)
        self.assertEqual(self.call('/api/get_route.php?r=ROT-ZZZZ')[0],404)
        r,_=self.create()
        self.assertEqual(self.call('/api/update_route_status.php',{'route_id':r,'stop_id':'synthetic-a','status':'bad'})[0],400)
        self.assertEqual(self.call('/api/optimize_sequence.php',{'stops':[{'id':'a','lat':0,'lon':0}],'origin':{'lat':None,'lon':0}})[0],400)
        self.assertEqual(self.call('/api/process_danfe.php',{'image_base64':'not-base64'})[0],400)
        self.assertEqual(self.call('/api/process_danfe.php',{'image_base64':'SGVsbG8='})[0],400)
        self.assertEqual(self.call('/api/save_route.php')[0],405)

    def test_lifecycle_concurrency_and_retries(self):
        r,t=self.create()
        def update(stop):
            return self.call('/api/update_route_status.php',{'route_id':r,'stop_id':stop,'status':'delivered','operation_id':'operation-'+stop,'expected_version':0},identity=None,token=t)
        with concurrent.futures.ThreadPoolExecutor() as pool:
            results=list(pool.map(update,['synthetic-a','synthetic-b']))
        self.assertTrue(all(code==200 for code,_ in results),results)
        self.assertEqual(update('synthetic-a'),results[0])
        code,route=self.call('/api/get_route.php?r='+r);self.assertEqual(route['route']['delivered_stops'],2)
        self.assertEqual(self.call('/api/update_route_status.php',{'route_id':r,'stop_id':'synthetic-a','status':'pending','operation_id':'conflict-operation','expected_version':0})[0],409)
        self.assertEqual(self.call('/api/update_route_status.php',{'route_id':r,'stop_id':'synthetic-a','status':'pending','operation_id':'undo-operation-01','expected_version':1})[0],200)
        finish={'route_id':r,'stops':[{'id':'forged','status':'delivered'}]}
        code,finished=self.call('/api/finish_route.php',finish,identity=None,token=t)
        self.assertEqual(code,200);self.assertEqual(finished['total_stops'],2);self.assertEqual(finished['delivered_stops'],1)
        self.assertEqual(self.call('/api/finish_route.php',finish)[1],finished)
        _,history=self.call('/api/get_history.php');self.assertEqual(sum(x['route_id']==r for x in history['history']),1)
        self.assertEqual(self.call('/api/update_route_status.php',{'route_id':r,'stop_id':'synthetic-b','status':'pending'})[0],409)
        self.assertEqual(self.call('/api/finish_route.php',{'route_id':'ROT-ZZZZ'})[0],404)
        self.assertEqual(self.call('/api/finish_route.php',{'stops':[]})[0],409)

    def test_corruption_and_write_failure(self):
        r,_=self.create();path=self.data/'routes'/(r+'.json');path.write_text('{')
        self.assertEqual(self.call('/api/get_route.php?r='+r)[0],500)
        self.assertEqual(path.read_text(),'{');path.unlink()
        r,_=self.create();path=self.data/'routes'/(r+'.json');before=path.read_bytes()
        path.parent.chmod(0o500)
        try: self.assertEqual(self.call('/api/update_route_status.php',{'route_id':r,'stop_id':'synthetic-a','status':'delivered'})[0],500)
        finally: path.parent.chmod(0o700)
        self.assertEqual(path.read_bytes(),before)

    @unittest.skipUnless(os.environ.get('ENTREGAS_BROWSER_TEST')=='1','opt-in real Chromium regression')
    def test_browser_offline_workflow(self):
        route,token=self.create()
        subprocess.run(['node',str(ROOT/'tests/browser.cjs')],cwd=ROOT,
                       env=dict(os.environ,TEST_BASE=self.origin,TEST_ROUTE=route,TEST_TOKEN=token),check=True,timeout=90)

    def test_forced_collision(self):
        # Execute the actual store allocator with an injected code generator, never expose a test hook over HTTP.
        script=Path(self.tmp.name)/'collision.php'
        script.write_text("<?php function jsonResponse($x,$s=200){throw new Exception('invalid');} require "+repr(str(ROOT/'api/runtime.php'))+"; storeLock(function(){ $b=['stops'=>[['id'=>'synthetic','lat'=>0,'lon'=>0]]]; $a=createRoute($b,fn()=>'ROT-2222'); $before=file_get_contents(routePath('ROT-2222')); $i=0; $b=createRoute($b,function()use(&$i){return ++$i===1?'ROT-2222':'ROT-3333';}); if($before!==file_get_contents(routePath('ROT-2222')) || $b[0]['route_id']!=='ROT-3333')exit(1); });")
        subprocess.run([PHP,str(script)],env=dict(os.environ,ENTREGAS_DATA_DIR=str(self.data)),check=True,capture_output=True)

if __name__=='__main__': unittest.main()
