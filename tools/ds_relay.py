"""Temporary API-only bridge for Drop. Never serves files or accepts upstream URLs."""
import argparse
from collections import deque
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import secrets
import sys
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
ORIGIN = 'https://drop.apps-hp.danlu.netease.com'
STATE = ROOT / '.artifacts/ds-relay'
ROUTES = {'/api/status': 'GET', '/api/director': 'POST', '/api/reply-intent': 'POST'}
MODES = {'companion', 'followup', 'search', 'action_card', 'world_atmosphere',
         'deal', 'aftermath', 'reaction', 'item_reaction'}


class RelayHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False
    request_queue_size = 32

    def __init__(self, address, backend_port, token, hourly_limit=300):
        self.backend_port = backend_port
        self.prefix = '/' + token
        self.hourly_limit = hourly_limit
        self.calls = deque()
        self.call_lock = threading.Lock()
        self.slots = threading.BoundedSemaphore(4)
        self.completed = 0
        super().__init__(address, Relay)

    def reserve(self):
        with self.call_lock:
            now = time.monotonic()
            while self.calls and now - self.calls[0] >= 3600:
                self.calls.popleft()
            if len(self.calls) >= self.hourly_limit:
                return False
            self.calls.append(now)
            return True


class Relay(BaseHTTPRequestHandler):
    server_version = 'JianghuRelay'
    sys_version = ''

    def setup(self):
        super().setup()
        self.connection.settimeout(25)

    def log_message(self, *_):
        pass  # Never record player text, game context or the bridge path.

    def reply(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Vary', 'Origin')
        if self.headers.get('Origin') == ORIGIN:
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Max-Age', '600')
        if status == 429:
            self.send_header('Retry-After', '60')
        self.end_headers()
        try:
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def route(self):
        for path, method in ROUTES.items():
            if secrets.compare_digest(self.path, self.server.prefix + path):
                if self.headers.get('Origin') != ORIGIN:
                    self.reply(403, {'error': 'origin_not_allowed'})
                    return None
                if self.command not in (method, 'OPTIONS'):
                    self.reply(405, {'error': 'method_not_allowed'})
                    return None
                return path
        self.reply(404, {'error': 'not_found'})
        return None

    def do_OPTIONS(self):
        path = self.route()
        if not path:
            return
        headers = {h.strip().lower() for h in self.headers.get('Access-Control-Request-Headers', '').split(',') if h.strip()}
        if self.headers.get('Access-Control-Request-Method') != ROUTES[path] or headers - {'content-type'}:
            return self.reply(403, {'error': 'preflight_not_allowed'})
        self.reply(200, {'ok': True})

    def do_GET(self):
        path = self.route()
        if path:
            self.forward(path)

    def do_POST(self):
        path = self.route()
        if not path:
            return
        if self.headers.get('Transfer-Encoding') or self.headers.get_content_type() != 'application/json':
            return self.reply(400, {'error': 'invalid_request'})
        try:
            lengths = self.headers.get_all('Content-Length', [])
            length = int(lengths[0]) if len(lengths) == 1 else 0
            if not 0 < length <= (2048 if path == '/api/reply-intent' else 40000):
                return self.reply(413, {'error': 'invalid_length'})
            body = self.rfile.read(length)
            data = json.loads(body)
            if not isinstance(data, dict):
                raise ValueError()
            if path == '/api/director':
                mode = data.get('mode')
                if mode is not None and (not isinstance(mode, str) or mode not in MODES):
                    raise ValueError()
                if mode is None and not isinstance(data.get('actions'), list):
                    raise ValueError()
            else:
                from tools.reply_intent import request_text
                request_text(data)
        except (ValueError, TypeError, UnicodeError, TimeoutError):
            return self.reply(400, {'error': 'invalid_request'})
        if not self.server.slots.acquire(blocking=False):
            return self.reply(429, {'error': 'busy'})
        try:
            if not self.server.reserve():
                return self.reply(429, {'error': 'session_budget'})
            self.forward(path, body)
        finally:
            self.server.slots.release()

    def forward(self, path, body=None):
        connection = HTTPConnection('127.0.0.1', self.server.backend_port, timeout=23)
        try:
            # Exact allowlist and fixed loopback target; no incoming authorization,
            # cookies, Origin, paths or arbitrary headers reach the local backend.
            connection.request('GET' if body is None else 'POST', path, body=body,
                               headers={'Content-Type': 'application/json'})
            response = connection.getresponse()
            raw = response.read(65537)
            if len(raw) > 65536 or response.getheader('Content-Type', '').split(';')[0] != 'application/json':
                raise ValueError()
            result = json.loads(raw)
            if body is not None and response.status == 200:
                self.server.completed += 1
                print(json.dumps({'event': 'ds_response', 'route': path, 'status': 200,
                                  'completed': self.server.completed}), flush=True)
            self.reply(response.status, result)
        except Exception:
            self.reply(502, {'error': 'unavailable'})
        finally:
            connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--hourly-limit', type=int, default=300)
    args = parser.parse_args()
    import serve
    if not serve.setting('LLM_API_KEY'):
        parser.error('LLM_API_KEY is missing from the server environment')
    STATE.mkdir(parents=True, exist_ok=True)
    token_file = STATE / 'route-token.txt'
    if not token_file.exists():
        token_file.write_text(secrets.token_urlsafe(24), encoding='utf-8')
    token = token_file.read_text(encoding='utf-8').strip()
    # Private embedded backend: no dependency on the author's running game server.
    backend = ThreadingHTTPServer(('127.0.0.1', 0), serve.Server)
    threading.Thread(target=backend.serve_forever, daemon=True).start()
    relay = RelayHTTPServer(('127.0.0.1', args.port), backend.server_port, token, args.hourly_limit)
    ready = {'event': 'ready', 'port': relay.server_port, 'hourlyLimit': args.hourly_limit}
    (STATE / 'listener.json').write_text(json.dumps(ready), encoding='utf-8')
    print(json.dumps(ready), flush=True)
    try:
        relay.serve_forever()
    finally:
        relay.server_close()
        backend.shutdown()
        backend.server_close()


if __name__ == '__main__':
    main()
