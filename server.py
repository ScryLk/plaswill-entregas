#!/usr/bin/env python3
"""
Plaswill Entregas - Servidor Local e API Runner
Permite rodar a mini-aplicação completa em qualquer ambiente (Mac/Linux/VPS).
Adaptador local: frontend Python e API PHP única, sem duplicar regras de segurança.
"""

import http.server
import socketserver
import os
import urllib.parse
import http.client
import subprocess
import shutil
import sys
import socket

PORT = int(os.environ.get("PORT", 8085))
WEB_DIR = os.path.dirname(os.path.abspath(__file__))

class DeliveryHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def proxy_api(self):
        try: length = int(self.headers.get('Content-Length', '0'))
        except ValueError: self.send_error(400); return
        if length < 0 or length > 8388608:
            self.send_error(413); return
        # Do not forward identity headers: the PHP backend owns authorization.
        headers = {key: self.headers[key] for key in ('Content-Type', 'Authorization', 'Origin', 'Cookie', 'X-CSRF-Token') if key in self.headers}
        conn = http.client.HTTPConnection('127.0.0.1', self.server.api_port, timeout=35)
        try:
            conn.request(self.command, self.path, self.rfile.read(length) if length else None, headers)
            response = conn.getresponse(); body = response.read()
            self.send_response(response.status)
            self.send_header('Content-Type', response.getheader('Content-Type', 'application/json'))
            self.send_header('Content-Length', str(len(body)))
            for key, value in response.getheaders():
                if key.lower() in ('set-cookie', 'location', 'allow'): self.send_header(key, value)
            self.end_headers(); self.wfile.write(body)
        except (OSError, http.client.HTTPException):
            self.send_error(502, 'API indisponivel')
        finally:
            conn.close()

    def log_request(self, code='-', size='-'):
        path = urllib.parse.urlparse(self.path).path
        self.log_message('%s %s %s %s', self.command, path, str(code), str(size))

    def do_OPTIONS(self):
        self.send_error(405)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path.startswith('/api/'):
            self.proxy_api(); return
        allowed = {'/', '/index.html', '/motorista.html', '/app.js', '/motorista.js', '/outbox.js',
                   '/session.js', '/origin.json', '/driver.webmanifest', '/style.css', '/motorista.css', '/sw.js', '/manifest.json', '/qrcode.min.js'}
        import re
        if path not in allowed and not re.fullmatch(r'/(img|icons)/[A-Za-z0-9_.-]+', path):
            self.send_error(404); return
        super().do_GET()

    def do_HEAD(self):
        self.send_error(405)

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path.startswith('/api/'):
            self.proxy_api()
        else:
            self.send_error(404)

if __name__ == "__main__":
    php = os.environ.get('ENTREGAS_PHP_BIN') or shutil.which('php')
    if not php:
        sys.exit('PHP 8.2+ necessario para executar a API compartilhada. Configure ENTREGAS_PHP_BIN.')
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0)); api_port = probe.getsockname()[1]
    backend = subprocess.Popen([php, '-S', f'127.0.0.1:{api_port}', 'router.php'], cwd=WEB_DIR)
    try:
        with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), DeliveryHandler) as httpd:
            httpd.api_port = api_port
            print(f'Plaswill Entregas: porta local {PORT}; API PHP compartilhada', flush=True)
            httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        backend.terminate(); backend.wait(timeout=5)
