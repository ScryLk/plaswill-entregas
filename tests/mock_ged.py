"""HTTPS-only fake OAuth2/OCS provider and TLS facade, exclusively for isolated tests."""
import http.client
import http.server
import json
import secrets
import threading
import urllib.parse


class FakeGED(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *_):
        pass  # Never log authorization codes, tokens or forms, including synthetic ones.

    def reply(self, code, data=None, headers=None):
        body = b'' if data is None else json.dumps(data).encode()
        self.send_response(code)
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        data = urllib.parse.parse_qs(self.rfile.read(int(self.headers.get('Content-Length', 0))).decode())
        self.server.exchanges += 1
        if self.server.failure == 'token_down': return self.reply(503)
        if data.get('client_id') != ['fixture-client'] or data.get('client_secret') != ['fixture-secret-only-tests']:
            return self.reply(401)
        if data.get('grant_type') != ['authorization_code'] or data.get('redirect_uri') != [self.server.app_origin + '/api/auth_callback.php']:
            return self.reply(400)
        code = (data.get('code') or [''])[0]
        user = self.server.codes.pop(code, None)
        if user is None: return self.reply(400)
        token = secrets.token_hex(32)
        self.server.tokens[token] = user
        self.reply(200, {'token_type':'Bearer','access_token':token,'refresh_token':'synthetic-unused-refresh',
                         'expires_in':self.server.expires_in,'user_id':user})

    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        if p.path == '/apps/oauth2/authorize':
            query = urllib.parse.parse_qs(p.query)
            if query.get('response_type') != ['code'] or query.get('client_id') != ['fixture-client']:
                return self.reply(400)
            if query.get('redirect_uri') != [self.server.app_origin + '/api/auth_callback.php']: return self.reply(400)
            code = secrets.token_hex(24)
            self.server.codes[code] = self.server.login_user
            target = query['redirect_uri'][0] + '?' + urllib.parse.urlencode({'code':code,'state':query['state'][0]})
            return self.reply(303, headers={'Location':target})
        self.server.identity_checks += 1
        if self.server.failure == 'identity_down': return self.reply(503)
        if self.server.failure == 'redirect': return self.reply(302, headers={'Location':'https://untrusted.invalid/token'})
        auth = self.headers.get('Authorization', '')
        user = self.server.tokens.get(auth.removeprefix('Bearer ')) if auth.startswith('Bearer ') else None
        if user is None: return self.reply(401)
        if self.headers.get('OCS-APIRequest') != 'true': return self.reply(403)
        if self.server.failure == 'ocs_failure': return self.reply(200, {'ocs':{'meta':{'status':'failure','statuscode':997},'data':{}}})
        if p.path == '/ocs/v1.php/cloud/user':
            # Userinfo groups deliberately differ: product must use the groups endpoint.
            data = {'id': 'wrong-user' if self.server.failure == 'wrong_user' else user, 'groups':['admin']}
        elif p.path == '/ocs/v1.php/cloud/users/' + urllib.parse.quote(user, safe='') + '/groups':
            data = {'groups': 'admin' if self.server.failure == 'bad_groups' else self.server.groups[user]}
        else: return self.reply(404)
        self.reply(200, {'ocs':{'meta':{'status':'ok','statuscode':100},'data':data}})


class TLSFacade(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def forward(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        headers = {k:v for k,v in self.headers.items() if k.lower() not in ('host','connection')}
        conn = http.client.HTTPConnection('127.0.0.1', self.server.php_port, timeout=20)
        conn.request(self.command, self.path, body, headers)
        response = conn.getresponse(); body = response.read()
        self.send_response(response.status)
        for k,v in response.getheaders():
            if k.lower() not in ('server','date','connection','content-length'): self.send_header(k,v)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body); conn.close()

    do_GET = forward
    do_POST = forward


def serve_tls(handler, context):
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    return server
