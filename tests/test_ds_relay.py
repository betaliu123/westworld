from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading
import unittest
from unittest.mock import patch
from tools.ds_relay import RelayHTTPServer, ORIGIN


class Backend(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        self.respond()

    def do_POST(self):
        self.respond()

    def respond(self):
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        self.server.received.append((self.path, dict(self.headers), data))
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"configured":true}' if self.command == 'GET' else b'{"action":"follow"}')


class RelayTests(unittest.TestCase):
    def setUp(self):
        self.backend = ThreadingHTTPServer(('127.0.0.1', 0), Backend)
        self.backend.received = []
        self.relay = RelayHTTPServer(('127.0.0.1', 0), self.backend.server_port, 'test-route', hourly_limit=2)
        for server in (self.backend, self.relay):
            threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .01}, daemon=True).start()

    def tearDown(self):
        for server in (self.relay, self.backend):
            server.shutdown()
            server.server_close()

    def request(self, path='/test-route/api/status', method='GET', body=None, headers=None):
        conn = HTTPConnection('127.0.0.1', self.relay.server_port, timeout=2)
        conn.request(method, path, body=body, headers={'Origin': ORIGIN, **(headers or {})})
        response = conn.getresponse()
        result = response.status, dict(response.headers), response.read()
        conn.close()
        return result

    def post(self, value, headers=None):
        return self.request('/test-route/api/director', 'POST', json.dumps(value),
                            {'Content-Type': 'application/json', **(headers or {})})

    def test_status_and_preflight(self):
        status, headers, body = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(headers['Access-Control-Allow-Origin'], ORIGIN)
        self.assertTrue(json.loads(body)['configured'])
        status, headers, _ = self.request('/test-route/api/director', 'OPTIONS', headers={
            'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'})
        self.assertEqual(status, 200)
        self.assertEqual(len(self.backend.received), 1)

    def test_no_files_voice_or_unknown_routes(self):
        for path in ('/', '/.env', '/serve.py', '/test-route/.env', '/test-route/api/voice',
                     '/api/status', '/wrong/api/status', '/test-route/api/status?x=1',
                     '/test-route/api/status/../.env'):
            self.assertEqual(self.request(path)[0], 404, path)
        self.assertEqual(self.backend.received, [])

    def test_origin_and_methods_are_checked(self):
        status, headers, _ = self.request(headers={'Origin': 'https://evil.example'})
        self.assertEqual(status, 403)
        self.assertNotIn('Access-Control-Allow-Origin', headers)
        self.assertEqual(self.request(headers={'Origin': 'null'})[0], 403)
        self.assertEqual(self.request('/test-route/api/director')[0], 405)
        self.assertEqual(self.request('/test-route/api/status', 'OPTIONS', headers={
            'Access-Control-Request-Method': 'POST'})[0], 403)
        self.assertEqual(self.backend.received, [])

    def test_only_fixed_backend_with_no_incoming_credentials(self):
        value = {'mode': 'companion', 'text': 'follow', 'allowed': ['follow']}
        self.assertEqual(self.post(value, {'Authorization': 'Bearer unrelated', 'Cookie': 'private=value'})[0], 200)
        path, headers, body = self.backend.received[0]
        self.assertEqual(path, '/api/director')
        self.assertEqual(json.loads(body), value)
        self.assertNotIn('Authorization', headers)
        self.assertNotIn('Cookie', headers)
        self.assertNotIn('Origin', headers)

    def test_invalid_payloads_never_reach_ds(self):
        for value in ([], {}, {'mode': 'custom'}, {'mode': ['companion']}):
            self.assertEqual(self.post(value)[0], 400)
        self.assertEqual(self.request('/test-route/api/director', 'POST', 'x' * 40001,
                                      {'Content-Type': 'application/json'})[0], 413)
        self.assertEqual(self.request('/test-route/api/reply-intent', 'POST', '{"text":""}',
                                      {'Content-Type': 'application/json'})[0], 400)
        self.assertEqual(self.backend.received, [])

    def test_limit_preserves_status_and_prevents_upstream_call(self):
        for _ in range(2):
            self.assertEqual(self.post({'mode': 'companion'})[0], 200)
        self.assertEqual(self.post({'mode': 'companion'})[0], 429)
        self.assertEqual(len(self.backend.received), 2)
        self.assertEqual(self.request()[0], 200)

    def test_disconnected_backend_is_json_error(self):
        # Windows can delay a refused TCP connection; inject the transport error.
        with patch('tools.ds_relay.HTTPConnection.request', side_effect=ConnectionRefusedError):
            # Keep the test client's connection intact while failing only the relay.
            import http.client
            conn = http.client.HTTPConnection('127.0.0.1', self.relay.server_port, timeout=2)
            conn.putrequest('GET', '/test-route/api/status')
            conn.putheader('Origin', ORIGIN)
            conn.endheaders()
            response = conn.getresponse()
            status, headers, body = response.status, dict(response.headers), response.read()
            conn.close()
        self.assertEqual(status, 502)
        self.assertEqual(headers['Access-Control-Allow-Origin'], ORIGIN)
        self.assertEqual(json.loads(body), {'error': 'unavailable'})


if __name__ == '__main__':
    unittest.main()
