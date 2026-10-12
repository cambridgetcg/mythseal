/** Version numbers, secret preflight and the job summary for .github/workflows/mobile.yml.
 * Prints secret names, never values. */
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAY_VERSION_CODE_MAX = 2100000000;
const SECRETS = Object.freeze({
  ios: { always: ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_B64', 'APPLE_TEAM_ID'], upload: [] },
  android: { always: ['ANDROID_UPLOAD_KEYSTORE_B64', 'ANDROID_UPLOAD_KEYSTORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD'], upload: ['PLAY_SERVICE_ACCOUNT_JSON'] },
});
const LABELS = { ios: 'iOS', android: 'Android' };

export function marketingVersion(version) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Marketing version must be X.Y.Z for both stores: ${version}`);
  return version;
}

export function buildNumber({ runNumber, offset = '0' }) {
  if (!/^[1-9]\d*$/.test(String(runNumber ?? ''))) throw new Error(`GITHUB_RUN_NUMBER must be a positive integer: ${runNumber}`);
  const extra = offset === '' || offset === undefined ? '0' : String(offset);
  if (!/^\d+$/.test(extra)) throw new Error(`MOBILE_BUILD_OFFSET must be a non-negative integer: ${offset}`);
  const number = Number(runNumber) + Number(extra);
  if (number > PLAY_VERSION_CODE_MAX) throw new Error(`Build number ${number} exceeds Play's versionCode ceiling ${PLAY_VERSION_CODE_MAX}`);
  return number;
}

export function requiredSecrets(platform, { upload }) {
  const set = SECRETS[platform];
  if (!set) throw new Error(`Unknown platform: ${platform}`);
  return [...set.always, ...(upload ? set.upload : [])];
}

export const missingSecrets = (env, names) => names.filter(name => !String(env[name] ?? '').trim());

export function summaryMarkdown({ platform, upload, version, number, release }) {
  if (release?.target !== 'native') throw new Error('dist/release.json is not a native build; run npm run build:native');
  return [
    `### ${LABELS[platform]} · ${upload ? 'upload' : 'dry run'}`,
    '',
    '| Field | Value |', '| --- | --- |',
    `| Version | ${version} |`,
    `| Build number | ${number} |`,
    `| Commit | \`${release.gitCommit}\` |`,
    `| Assets manifest | \`${release.assetsManifestSHA256}\` |`,
    '',
    'Both platforms of one run must show the same build number and manifest.',
    '',
  ].join('\n');
}

function main([command, platform]) {
  const upload = process.env.MOBILE_UPLOAD === 'true';
  if (command === 'preflight') {
    const missing = missingSecrets(process.env, requiredSecrets(platform, { upload }));
    if (missing.length) {
      console.error(`Missing ${platform} secrets: ${missing.join(', ')} (set them in the mobile-stores environment)`);
      process.exit(1);
    }
    console.log(`${LABELS[platform]} secrets present for a ${upload ? 'upload' : 'dry'} run.`);
    return;
  }
  if (command === 'info') {
    requiredSecrets(platform, { upload });
    const root = fileURLToPath(new URL('../', import.meta.url));
    const version = marketingVersion(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version);
    const number = buildNumber({ runNumber: process.env.GITHUB_RUN_NUMBER, offset: process.env.MOBILE_BUILD_OFFSET });
    const release = JSON.parse(readFileSync(resolve(root, 'dist/release.json'), 'utf8'));
    const summary = summaryMarkdown({ platform, upload, version, number, release });
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\nbuild_number=${number}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log(summary);
    return;
  }
  throw new Error('Usage: node tools/mobile-release.mjs <preflight|info> <ios|android>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
