import assert from 'node:assert/strict';
import test from 'node:test';
import { runDeploy } from '../tools/deploy.mjs';

const ACCOUNT_ID = 'cf4198e651bf3009877d49f688c9d88e';
const release = { clientVersion: '0.5.1', gitCommit: 'a'.repeat(40) };
function fixture(overrides = {}) {
  const calls = [];
  const logs = [];
  let builds = 0;
  const options = {
    env: { PATH: '/shared/tools', WRANGLER_WRITE_LOGS: 'true' },
    log: message => logs.push(message),
    buildProject: async () => { builds++; return release; },
    execute(command, args, settings) {
      const cli = command === 'git' ? args : args.slice(1);
      const call = { command, args, cli, settings };
      calls.push(call);
      const overridden = overrides.reply?.(call);
      if (overridden !== undefined) return overridden;
      if (command === 'git') return cli[0] === 'status' ? '' : release.gitCommit;
      if (cli[0] === '--version') return '4.136.1';
      if (cli[0] === 'whoami') return JSON.stringify({ loggedIn: true, accounts: [{ id: ACCOUNT_ID }] });
      if (cli[0] === 'secret') return JSON.stringify([{ name: 'SUPABASE_PUBLISHABLE_KEY', type: 'secret_text' }]);
      return '';
    },
  };
  return { options, calls, logs, get builds() { return builds; } };
}
const deployments = calls => calls.filter(({ cli }) => cli[0] === 'deploy' && !cli.includes('--dry-run'));

test('dirty-checkout dry run uses only project-local Wrangler and local bundle checks', async () => {
  const f = fixture({ reply: ({ command }) => { if (command === 'git') throw new Error('dirty checkout'); } });
  const result = await runDeploy({ ...f.options, args: ['--dry-run'] });
  assert.equal(result.dryRun, true);
  assert.equal(f.builds, 1);
  assert.equal(deployments(f.calls).length, 0);
  assert.deepEqual(f.calls.map(({ cli }) => cli[0]), ['--version', 'deploy', 'deploy']);
  for (const call of f.calls) {
    assert.equal(call.command, process.execPath);
    assert.match(call.args[0], /\/node_modules\/wrangler\/bin\/wrangler\.js$/);
    assert.equal(call.settings.env.WRANGLER_WRITE_LOGS, 'false');
    assert.equal(call.settings.env.WRANGLER_SEND_METRICS, 'false');
    assert.equal(call.settings.stdio[2], 'pipe');
    assert.ok(call.cli.includes('--env-file'));
  }
});

test('real release verifies account/binding, checks both bundles, then retains apex bindings', async () => {
  const f = fixture();
  await runDeploy(f.options);
  const writes = deployments(f.calls);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes.map(({ cli }) => cli[cli.indexOf('--config') + 1]), ['wrangler.jsonc', 'wrangler.www.jsonc']);
  assert.ok(writes[0].cli.includes('--keep-vars'));
  assert.ok(!writes[0].cli.includes('--var'));
  assert.ok(!writes[0].cli.includes('--secrets-file'));
  assert.equal(f.calls.filter(({ cli }) => cli.includes('--dry-run')).length, 2);
  assert.ok(f.calls.findIndex(({ cli }) => cli[0] === 'secret') < f.calls.indexOf(writes[0]));
  assert.ok(f.calls.filter(({ cli }) => cli.includes('--dry-run')).every(call => f.calls.indexOf(call) < f.calls.indexOf(writes[0])));
});

for (const scenario of [
  { name: 'wrong authenticated account', command: 'whoami', reply: '{"loggedIn":true,"accounts":[{"id":"other"}]}', error: /cannot access/ },
  { name: 'missing publishable binding', command: 'secret', reply: '[]', error: /SUPABASE_PUBLISHABLE_KEY is missing/ },
  { name: 'invalid identity JSON', command: 'whoami', reply: 'private provider response', error: /identity response was invalid/ },
  { name: 'unexpected binding type', command: 'secret', reply: '[{"name":"SUPABASE_PUBLISHABLE_KEY","type":"plain_text"}]', error: /SUPABASE_PUBLISHABLE_KEY is missing/ },
]) {
  test(`${scenario.name} prevents every deployment`, async () => {
    const f = fixture({ reply: ({ cli }) => cli[0] === scenario.command ? scenario.reply : undefined });
    await assert.rejects(runDeploy(f.options), scenario.error);
    assert.equal(deployments(f.calls).length, 0);
    assert.equal(f.builds, 0);
  });
}

test('provider preflight failure is sanitized and cannot deploy', async () => {
  const f = fixture({ reply: ({ cli }) => { if (cli[0] === 'secret') throw new Error('sensitive upstream body'); } });
  await assert.rejects(runDeploy(f.options), error => {
    assert.match(error.message, /binding metadata/);
    assert.doesNotMatch(error.message, /sensitive upstream body/);
    return true;
  });
  assert.equal(deployments(f.calls).length, 0);
  assert.doesNotMatch(f.logs.join('\n'), /sensitive upstream body/);
});

test('dirty checkout and conflicting account environment stop before provider checks', async () => {
  const dirty = fixture({ reply: ({ command, cli }) => command === 'git' && cli[0] === 'status' ? ' M app.mjs' : undefined });
  await assert.rejects(runDeploy(dirty.options), /outstanding work/);
  assert.equal(dirty.calls.length, 1);
  const wrong = fixture();
  await assert.rejects(runDeploy({ ...wrong.options, env: { CLOUDFLARE_ACCOUNT_ID: 'other' } }), /environment override/);
  assert.equal(wrong.calls.length, 0);
});

test('failed second bundle check prevents both hosted deployments', async () => {
  const f = fixture({ reply: ({ cli }) => {
    if (cli[0] === 'deploy' && cli.includes('wrangler.www.jsonc')) throw new Error('bundle error');
  } });
  await assert.rejects(runDeploy(f.options), /Local bundle check failed/);
  assert.equal(deployments(f.calls).length, 0);
});

test('ambiguous deployment failure is not retried and stops the following Worker', async () => {
  const f = fixture({ reply: ({ cli }) => {
    if (cli[0] === 'deploy' && !cli.includes('--dry-run')) throw new Error('sensitive upstream body');
  } });
  await assert.rejects(runDeploy(f.options), /Inspect provider state before retrying/);
  assert.equal(deployments(f.calls).length, 1);
});
