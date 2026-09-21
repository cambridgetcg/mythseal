#!/usr/bin/env python3
"""Serve the local game without dependencies; never expose it to the LAN."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent.parent

class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

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
