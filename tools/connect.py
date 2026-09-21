#!/usr/bin/env python3
"""Owner-operated login helper. Never pass a credential through shell arguments."""
import getpass
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import warnings
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
PINATA_FILES = 'https://api.pinata.cloud/v3/files/public?limit=1'


def resend_environment():
    """Owner Terminal login must use official Resend and native credential storage."""
    env = os.environ.copy()
    for name in ('CI', 'GITHUB_ACTIONS', 'RESEND_API_KEY', 'RESEND_PROFILE',
                 'RESEND_BASE_URL', 'RESEND_CREDENTIAL_STORE', 'XDG_CONFIG_HOME',
                 'NODE_OPTIONS', 'npm_config_node_options', 'NPM_CONFIG_NODE_OPTIONS'):
        env.pop(name, None)
    env['RESEND_BASE_URL'] = 'https://api.resend.com'
    env['RESEND_CREDENTIAL_STORE'] = 'secure_storage'
    return env


def resend_check():
    """Read domain access; never display credentials or provider response bodies."""
    try:
        result = subprocess.run([
            str(ROOT / 'node_modules/.bin/resend'), '--profile', 'mythseal',
            'domains', 'list', '--limit', '100', '--json',
        ], cwd=ROOT, env=resend_environment(), capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print('Resend connection not verified. Choose 4 to complete owner login; no email sent.')
            return False
        body = json.loads(result.stdout)
        domains = body.get('data') if isinstance(body, dict) else None
        if (not isinstance(body, dict) or body.get('object') != 'list' or 'error' in body
                or not isinstance(body.get('has_more'), bool) or not isinstance(domains, list)
                or (body['has_more'] and not domains)
                or any(not isinstance(domain, dict) or not isinstance(domain.get('id'), str)
                       or not domain['id'] or not isinstance(domain.get('name'), str)
                       or not domain['name'] for domain in domains)):
            print('Resend returned an unexpected response. No response body or credential displayed.')
            return False
        print(f'Resend domain-read access verified for profile mythseal ({len(domains)} domains on this page).')
        print('No email sent. Sending-domain verification and Supabase SMTP are separate setup steps.')
        return True
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError):
        print('Resend check could not complete. No credential or provider response displayed.')
        return False


def resend_login():
    if not sys.stdin.isatty() or not sys.stdout.isatty() or os.environ.get('TERM') == 'dumb':
        print('Open Connect.command in your own Terminal for Resend browser login.')
        return
    if sys.platform != 'darwin':
        print('This helper requires macOS Keychain. Use the official Resend CLI on other platforms.')
        return
    print('\nChoose "Login with Resend (opens browser)" — the first choice — then press Enter.')
    print('Complete sign-in and authorization in the official Resend browser page.')
    print('Profile: mythseal. Credentials stay in macOS Keychain; no API key is needed in chat.')
    result = subprocess.run([
        str(ROOT / 'node_modules/.bin/resend'), '--profile', 'mythseal', 'login',
    ], cwd=ROOT, env=resend_environment())
    if result.returncode != 0:
        print('Resend login did not complete. Choose 4 to retry when ready.')
        return
    resend_check()


def supabase_login():
    print('\nFollow the Supabase prompts in this Terminal; press Enter if asked to open the browser.')
    print('If the browser does not open, use the official login link printed below.')
    # A Terminal opened from Codex can inherit agent markers. This action is
    # owner-operated, so explicitly retain interactive text output and streams.
    result = subprocess.run([
        'npx', '--no-install', 'supabase',
        '--agent', 'no', '--output-format', 'text',
        'login', '--name', 'mythseal-dev',
    ], cwd=ROOT)
    if result.returncode != 0:
        print('Supabase login did not complete. You can choose 1 to try again.')


def save_pinata_token(root, token):
    """Preserve unrelated settings and atomically store a validated, single-line JWT."""
    if len(token) > 16384 or not re.fullmatch(r'[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', token):
        raise ValueError('Expected a JWT with three dot-separated sections.')
    target = Path(root) / '.env.local'
    old = ''
    try:
        descriptor = os.open(target, os.O_RDONLY | os.O_NOFOLLOW)
    except FileNotFoundError:
        pass
    else:
        with os.fdopen(descriptor, 'r') as current:
            if not stat.S_ISREG(os.fstat(current.fileno()).st_mode):
                raise ValueError('.env.local must be a regular file.')
            old = current.read()
    lines = [line for line in old.splitlines() if not re.match(r'^\s*(?:export\s+)?PINATA_JWT\s*=', line)]
    lines.append('PINATA_JWT=' + token)
    descriptor, temporary = tempfile.mkstemp(prefix='.mythseal-secret-', dir=root)
    try:
        with os.fdopen(descriptor, 'w') as output:
            os.fchmod(output.fileno(), 0o600)
            output.write('\n'.join(lines) + '\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def pinata():
    print('\nCreate a free account at https://app.pinata.cloud/')
    print('Then open https://app.pinata.cloud/developers/api-keys')
    print('Use a named Mythseal key: org:files:read and org:files:write; Admin is unnecessary.')
    print('Paste its JWT here, not into chat. Input is hidden.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', getpass.GetPassWarning)
            token = getpass.getpass('Pinata JWT: ').strip()
    except getpass.GetPassWarning:
        print('This terminal cannot hide input. Cancelled without reading a token; use the macOS Terminal app.')
        return
    if not token:
        print('No token entered; nothing changed.')
        return
    if len(token) > 16384 or not re.fullmatch(r'[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', token):
        print('That does not look like a JWT. Nothing changed.')
        return
    request = Request(PINATA_FILES, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
    try:
        with urlopen(request, timeout=15) as response:
            if response.status != 200:
                print('File-read access was not confirmed; nothing saved.')
                return
    except HTTPError as error:
        print(f'Pinata returned HTTP {error.code}. Check the account/key and file-read permission; nothing saved.')
        return
    except (URLError, TimeoutError):
        print('Pinata could not be reached; nothing saved. Try again later.')
        return
    save_pinata_token(ROOT, token)
    print('Pinata file-read access verified. JWT saved only in ignored .env.local, mode 0600.')
    print('No upload was made; publishing permission has not been exercised.')


def main():
    if not sys.stdin.isatty():
        print('Run this in your own interactive Terminal; never supply a token as an argument.')
        return 1
    while True:
        print('\nMythseal connections — owner login, local credentials')
        print('1. Supabase official browser login')
        print('2. Pinata hidden JWT entry + read-only connection check')
        print('3. Read-only connection report')
        print('4. Resend official browser login (macOS Keychain)')
        print('5. Resend read-only connection check')
        print('0. Exit')
        action = input('Choose: ').strip()
        if action == '1':
            supabase_login()
        elif action == '2':
            pinata()
        elif action == '3':
            subprocess.run(['npm', 'run', 'connections:check', '--', '--live'], cwd=ROOT)
        elif action == '4':
            resend_login()
        elif action == '5':
            resend_check()
        elif action == '0':
            return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled; no credential printed.')
        sys.exit(130)
    except OSError:
        print('The local credential file or required command could not be accessed. No credential printed.')
        sys.exit(1)
