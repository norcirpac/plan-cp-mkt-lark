"""Server tĩnh lúc dev extension + nhận báo cáo thăm dò SDK. Chỉ nghe 127.0.0.1.

Cách dùng (từ gốc repo): python3 tools/dev_server.py [port]
POST /__report  → lưu body vào tmp/probe-report.json
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT_PATH = os.path.join(ROOT, 'tmp', 'probe-report.json')
DEFAULT_PORT = 5190


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Lark giữ iframe extension lâu; tắt cache để mỗi lần Refresh là thấy code mới
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/__report':
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
        with open(REPORT_PATH, 'wb') as report_file:
            report_file.write(body)
        self.send_response(204)
        self.end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
print(f'Serving {ROOT} at http://127.0.0.1:{port}')
ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=ROOT)).serve_forever()
