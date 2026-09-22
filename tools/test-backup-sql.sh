#!/usr/bin/env bash
set -euo pipefail

# TEST_DATABASE_URL must point to a disposable local PostgreSQL database. The
# Python driver keeps even fixture passwords out of process arguments/output.
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 - "$task_root" <<'PY'
import concurrent.futures
import os
from pathlib import Path
import subprocess
import sys
import threading
from urllib.parse import unquote, urlsplit

root = Path(sys.argv[1])
try:
    parsed = urlsplit(os.environ.get('TEST_DATABASE_URL', ''))
    valid = (parsed.scheme in ('postgres', 'postgresql')
             and parsed.hostname in ('localhost', '127.0.0.1', '::1')
             and unquote(parsed.path) == '/mythseal_test'
             and parsed.username and not parsed.query and not parsed.fragment)
    port = parsed.port or 5432
except ValueError:
    valid = False
if not valid:
    sys.exit('Refusing SQL fixture setup: set TEST_DATABASE_URL to a loopback PostgreSQL URL for database mythseal_test, without query options.')

# Ignore inherited libpq routing/service options. No remote database or user
# credential fallback may bypass the URL guard.
env = {key: value for key, value in os.environ.items() if not key.startswith('PG')}
env.update(PGHOST=parsed.hostname, PGPORT=str(port), PGDATABASE='mythseal_test',
           PGUSER=unquote(parsed.username), PGPASSWORD=unquote(parsed.password or ''),
           PGPASSFILE=os.devnull, PGSERVICEFILE=os.devnull, PGSSLMODE='disable',
           PGCONNECT_TIMEOUT='5')
command = ['psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']

def sql(statement):
    return subprocess.run(command, input=statement, env=env, text=True,
                          capture_output=True, timeout=30)

def require_success(result, stage):
    if result.returncode:
        # SQL is checked-in fixture text only. Never echo the connection URL or
        # underlying environment when reporting a failed stage.
        print(f'{stage} failed:', file=sys.stderr)
        print(result.stderr[:12000], file=sys.stderr)
        raise SystemExit(1)

for path in [root / 'supabase/tests/bootstrap.sql',
             *sorted((root / 'supabase/migrations').glob('*.sql')),
             root / 'supabase/tests/private_journey_backups.sql',
             root / 'supabase/tests/wx01_journey_v2.sql']:
    require_success(sql(path.read_text()), path.name)

# Two genuinely independent database connections race their first insert and
# then an update. Exactly one succeeds; the other must observe a CAS conflict.
actor = 'de73b050-00b6-4f47-966c-abcd00000003'
saved = '{"format":"mythseal.offline-journey","version":1,"profile":{"version":3,"pending":null}}'
require_success(sql(f"insert into auth.users(id) values ('{actor}');"), 'concurrency fixture')
try:
    v2 = '{"format":"mythseal.offline-journey","version":2,"profile":{"version":4,"collectionVersion":2,"collectionExpansion":2,"wx01":{},"pending":null}}'
    for rpc, snapshot in [('mythseal_backup_write', saved), ('mythseal_backup_v2_write', v2)]:
        for revision in (0, 1):
            start = threading.Barrier(2)
            def race():
                start.wait(timeout=5)
                return sql(f"""begin;
                  set local role authenticated;
                  select set_config('request.jwt.claim.sub', '{actor}', true);
                  select public.{rpc}({revision}, '{snapshot}'::jsonb);
                  select pg_sleep(0.2);
                  commit;""")
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                pending = [pool.submit(race), pool.submit(race)]
                outcomes = [future.result(timeout=40) for future in pending]
            if (sum(result.returncode == 0 for result in outcomes) != 1
                    or sum('PT409' in result.stderr for result in outcomes) != 1):
                sys.exit(f'{rpc} concurrent revision {revision} did not produce one success and one CAS conflict.')
finally:
    require_success(sql(f"delete from auth.users where id = '{actor}';"), 'concurrency fixture cleanup')
print('Backup SQL v1/v2 passed: private grants, account and namespace isolation, size bounds, CAS, tombstones, and parallel first-write/update races.')
PY
