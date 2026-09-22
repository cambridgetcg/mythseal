#!/usr/bin/env python3
"""Serve the local game without dependencies; never expose it to the LAN."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import threading
import webbrowser
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_FILES = frozenset(json.loads((ROOT / 'hosting/public-assets.json').read_text()))

class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

    def end_headers(self):
        # Development URLs are unversioned: never mix modules from different edits.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_head(self):
        # Always read the current file, including edits within one mtime second.
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        path = unquote(urlsplit(self.path).path)
        relative = 'index.html' if path == '/' else path.removeprefix('/')
        if relative not in PUBLIC_FILES:
            self.send_error(404, 'Not found')
            return None
        current = Path(self.directory)
        for part in Path(relative).parts:
            current /= part
            if current.is_symlink():
                self.send_error(404, 'Not found')
                return None
        # Never fall back to a repository directory listing, even without index.html.
        self.path = '/' + relative
        return super().send_head()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4177)
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    port = args.port
    for candidate in range(args.port, args.port + 20):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', candidate), partial(GameHandler, directory=str(ROOT)))
            port = candidate
            break
        except OSError:
            continue
    else:
        raise SystemExit('Could not find a free local port.')
    url = f'http://127.0.0.1:{port}'
    print(f'萬象契 Mythseal · {url}\nPress Ctrl+C to close the game server.', flush=True)
    if args.open:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
