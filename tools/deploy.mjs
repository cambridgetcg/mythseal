import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const capture = (command, args) => execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();
if (capture('git', ['status', '--porcelain'])) throw new Error('Commit or preserve outstanding work before deploying a recorded release.');
if (capture('wrangler', ['--version']) !== '4.136.1') throw new Error('Run npm ci to install the pinned Wrangler version: 4.136.1.');
const release = await build(cwd);
for (const config of ['wrangler.jsonc', 'wrangler.www.jsonc']) {
  execFileSync('wrangler', ['deploy', '--config', config, '--message', `Mythseal ${release.clientVersion} ${release.gitCommit}`], {
    cwd, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
}
console.log(`Deployed Mythseal ${release.clientVersion} from ${release.gitCommit}. Verify HTTPS and release.json before recording success.`);
