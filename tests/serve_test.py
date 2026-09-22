import importlib.util
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location('mythseal_serve', Path(__file__).resolve().parents[1] / 'tools/serve.py')
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)


class LocalServerPrivacyTests(unittest.TestCase):
    def test_development_files_are_fresh_even_with_a_previous_validator(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('public game')
            (root / 'app.mjs').write_text('export const revision = 1;')
            (root / 'atelier.html').write_text('local art study')

            class QuietHandler(serve.GameHandler):
                def log_message(self, *_):
                    pass

            server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=directory))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = 'http://127.0.0.1:' + str(server.server_port)
            try:
                for path in ['/', '/app.mjs', '/atelier.html']:
                    with self.subTest(path=path):
                        with urlopen(base + path, timeout=3) as response:
                            original = response.read()
                            modified = response.headers['Last-Modified']
                            self.assertEqual(response.headers['Cache-Control'], 'no-store')
                        request = Request(base + path, headers={'If-Modified-Since': modified})
                        with urlopen(request, timeout=3) as response:
                            self.assertEqual(response.status, 200)
                            self.assertEqual(response.read(), original)
                            self.assertEqual(response.headers['Cache-Control'], 'no-store')
                with self.assertRaises(HTTPError) as error:
                    urlopen(base + '/private.mjs', timeout=3)
                self.assertEqual(error.exception.code, 404)
                self.assertEqual(error.exception.headers['Cache-Control'], 'no-store')
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)

    def test_same_public_allowlist_denies_credentials_private_code_and_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('public game')
            (root / '.env.local').write_text('PRIVATE_FIXTURE=value')
            (root / 'server').mkdir()
            (root / 'server/account-api.mjs').write_text('private server source')
            (root / 'app.mjs').symlink_to(root / '.env.local')

            class QuietHandler(serve.GameHandler):
                def log_message(self, *_):
                    pass

            server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=directory))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = 'http://127.0.0.1:' + str(server.server_port)
            try:
                with urlopen(base + '/', timeout=3) as response:
                    self.assertEqual(response.read(), b'public game')
                for path in ['/.env.local', '/server/account-api.mjs', '/.git/config', '/app.mjs', '/%2eenv.local', '/assets/../.env.local', '/hosting/public-assets.json']:
                    with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                        urlopen(base + path, timeout=3)
                    self.assertEqual(error.exception.code, 404)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)


if __name__ == '__main__':
    unittest.main()
