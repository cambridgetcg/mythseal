import importlib.util
import io
from pathlib import Path
import stat
import tempfile
import unittest
from unittest import mock
import warnings

spec = importlib.util.spec_from_file_location('mythseal_connect', Path(__file__).resolve().parents[1] / 'tools/connect.py')
connect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connect)


class SupabaseLoginTests(unittest.TestCase):
    def test_owner_menu_forces_interactive_mode_and_keeps_terminal_streams(self):
        with mock.patch.dict(connect.os.environ, {'CODEX_CI': '1'}), \
                mock.patch.object(connect.sys.stdin, 'isatty', return_value=True), \
                mock.patch('builtins.input', side_effect=['1', '0']), \
                mock.patch.object(connect.subprocess, 'run', return_value=mock.Mock(returncode=1)) as run, \
                mock.patch('sys.stdout', new_callable=io.StringIO) as output:
            self.assertEqual(connect.main(), 0)
            run.assert_called_once_with([
                'npx', '--no-install', 'supabase',
                '--agent', 'no', '--output-format', 'text',
                'login', '--name', 'mythseal-dev',
            ], cwd=connect.ROOT)
            self.assertEqual(connect.os.environ['CODEX_CI'], '1')
            self.assertIn('Supabase login did not complete', output.getvalue())


class SecretStorageTests(unittest.TestCase):
    def test_replacement_preserves_other_settings_and_restricts_permissions(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / '.env.local'
            target.write_text('# keep this\nSUPABASE_PROJECT_REF=fixture\nexport PINATA_JWT=old.fake.value\n')
            target.chmod(0o644)
            connect.save_pinata_token(root, 'new.fake.value')
            self.assertEqual(target.read_text(), '# keep this\nSUPABASE_PROJECT_REF=fixture\nPINATA_JWT=new.fake.value\n')
            self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)
            self.assertFalse(list(Path(root).glob('.mythseal-secret-*')))

    def test_symlink_cannot_redirect_a_secret_write(self):
        with tempfile.TemporaryDirectory() as root:
            outside = Path(root) / 'unrelated'
            outside.write_text('preserve')
            (Path(root) / '.env.local').symlink_to(outside)
            with self.assertRaises(OSError):
                connect.save_pinata_token(root, 'new.fake.value')
            self.assertEqual(outside.read_text(), 'preserve')

    def test_multiline_input_cannot_add_another_environment_variable(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(ValueError):
                connect.save_pinata_token(root, 'fake.fake.fake\nUNEXPECTED=value')
            self.assertFalse((Path(root) / '.env.local').exists())

    def test_hidden_input_failure_never_falls_back_to_echo_or_network(self):
        def no_hidden_input(*args, **kwargs):
            warnings.warn('cannot hide input', connect.getpass.GetPassWarning)
            raise AssertionError('Echoed fallback must never run')
        with mock.patch.object(connect.getpass, 'getpass', side_effect=no_hidden_input), mock.patch.object(connect, 'urlopen') as network, mock.patch('sys.stdout', new_callable=io.StringIO) as output:
            connect.pinata()
            network.assert_not_called()
            self.assertIn('Cancelled without reading a token', output.getvalue())


if __name__ == '__main__':
    unittest.main()
