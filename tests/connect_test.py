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


class ResendLoginTests(unittest.TestCase):
    def test_official_interactive_login_isolated_from_inherited_keys_and_ci(self):
        inherited = {'CI': 'true', 'GITHUB_ACTIONS': 'true', 'RESEND_API_KEY': 'unrelated-key',
                     'RESEND_BASE_URL': 'https://example.invalid', 'RESEND_CREDENTIAL_STORE': 'file', 'TERM': 'xterm-256color',
                     'XDG_CONFIG_HOME': '/fixture/unrelated', 'NODE_OPTIONS': '--require /fixture/hook.cjs',
                     'npm_config_node_options': '--require /fixture/hook.cjs', 'NPM_CONFIG_NODE_OPTIONS': '--inspect'}
        with mock.patch.dict(connect.os.environ, inherited), \
                mock.patch.object(connect.sys, 'platform', 'darwin'), \
                mock.patch.object(connect.sys.stdin, 'isatty', return_value=True), \
                mock.patch('sys.stdout', new_callable=io.StringIO) as output, \
                mock.patch.object(connect.subprocess, 'run', return_value=mock.Mock(returncode=1)) as run:
            with mock.patch.object(output, 'isatty', return_value=True):
                connect.resend_login()
            args, kwargs = run.call_args
            self.assertEqual(args[0], [str(connect.ROOT / 'node_modules/.bin/resend'), '--profile', 'mythseal', 'login'])
            self.assertNotIn('capture_output', kwargs)
            self.assertEqual(kwargs['env']['RESEND_BASE_URL'], 'https://api.resend.com')
            self.assertEqual(kwargs['env']['RESEND_CREDENTIAL_STORE'], 'secure_storage')
            self.assertNotIn('CI', kwargs['env'])
            self.assertNotIn('GITHUB_ACTIONS', kwargs['env'])
            self.assertNotIn('RESEND_API_KEY', kwargs['env'])
            for setting in ('XDG_CONFIG_HOME', 'NODE_OPTIONS', 'npm_config_node_options', 'NPM_CONFIG_NODE_OPTIONS'):
                self.assertNotIn(setting, kwargs['env'])
            self.assertEqual(connect.os.environ['RESEND_API_KEY'], 'unrelated-key')
            self.assertNotIn('unrelated-key', output.getvalue())

    def test_read_only_check_prints_count_without_provider_records_or_errors(self):
        for result, success in [(mock.Mock(returncode=0, stdout='{"object":"list","data":[{"id":"fixture-id","name":"private.example","token":"secret-fixture"}],"has_more":false}'), True),
                                (mock.Mock(returncode=1, stdout='secret-fixture', stderr='private.example'), False),
                                (mock.Mock(returncode=0, stdout='{"error":{"token":"secret-fixture"},"data":[]}'), False),
                                (mock.Mock(returncode=0, stdout='{"object":"list","data":[null],"has_more":false}'), False),
                                (mock.Mock(returncode=0, stdout='{"object":"list","data":[],"has_more":true}'), False)]:
            with mock.patch.object(connect.subprocess, 'run', return_value=result) as run, mock.patch('sys.stdout', new_callable=io.StringIO) as output:
                self.assertEqual(connect.resend_check(), success)
                self.assertEqual(run.call_args.args[0][-5:], ['domains', 'list', '--limit', '100', '--json'])
                self.assertNotIn('private.example', output.getvalue())
                self.assertNotIn('secret-fixture', output.getvalue())


if __name__ == '__main__':
    unittest.main()
