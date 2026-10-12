import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNumber, marketingVersion, missingSecrets, preflightProblems, requiredSecrets, summaryMarkdown } from '../tools/mobile-release.mjs';

test('marketing versions must be plain X.Y.Z for both stores', () => {
  assert.equal(marketingVersion('0.5.1'), '0.5.1');
  assert.equal(marketingVersion('12.0.3'), '12.0.3');
  for (const bad of ['0.6.0-beta', '1.2', 'v1.2.3', '1.2.3.4', '', undefined]) {
    assert.throws(() => marketingVersion(bad), /Marketing version must be X\.Y\.Z for both stores/, String(bad));
  }
});

test('build numbers are deterministic run number plus offset', () => {
  assert.equal(buildNumber({ runNumber: '7' }), 7);
  assert.equal(buildNumber({ runNumber: '7', offset: '100' }), 107);
  assert.equal(buildNumber({ runNumber: '7' }), buildNumber({ runNumber: '7' }), 'a re-run reuses its number');
  assert.equal(buildNumber({ runNumber: '7', offset: '' }), 7, 'unset repo variable means 0');
  for (const offset of ['-1', '1.5', 'ten', '1e3']) assert.throws(() => buildNumber({ runNumber: '7', offset }), /MOBILE_BUILD_OFFSET/, offset);
  for (const runNumber of ['0', '', 'abc', undefined]) assert.throws(() => buildNumber({ runNumber }), /GITHUB_RUN_NUMBER/, String(runNumber));
  assert.throws(() => buildNumber({ runNumber: '2100000000', offset: '1' }), /2100000000/, "Play's versionCode ceiling");
});

test('preflight asks only for what each mode needs, and names blanks', () => {
  assert.deepEqual(requiredSecrets('ios', { upload: false }), ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_B64', 'APPLE_TEAM_ID']);
  assert.deepEqual(requiredSecrets('ios', { upload: true }), ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_B64', 'APPLE_TEAM_ID']);
  const signing = ['ANDROID_UPLOAD_KEYSTORE_B64', 'ANDROID_UPLOAD_KEYSTORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD'];
  assert.deepEqual(requiredSecrets('android', { upload: false }), signing, 'a dry run needs no Play key');
  assert.deepEqual(requiredSecrets('android', { upload: true }), [...signing, 'PLAY_SERVICE_ACCOUNT_JSON']);
  assert.throws(() => requiredSecrets('web', { upload: false }), /Unknown platform: web/);
  assert.deepEqual(missingSecrets({ A: 'x', B: '   ', C: '' }, ['A', 'B', 'C', 'D']), ['B', 'C', 'D']);
});

test('the summary shows what both platforms must agree on, and nothing secret', () => {
  const text = summaryMarkdown({ platform: 'ios', upload: false, version: '0.5.1', number: 12,
    release: { assetsManifestSHA256: 'a'.repeat(64), gitCommit: 'b'.repeat(40), target: 'native' } });
  for (const part of ['iOS', 'dry run', '0.5.1', '12', 'a'.repeat(64), 'b'.repeat(40)]) assert.ok(text.includes(part), part);
  assert.throws(() => summaryMarkdown({ platform: 'ios', upload: false, version: '0.5.1', number: 1, release: { target: undefined } }), /native build/);
});

test('preflight catches a bad version or offset in seconds, before any setup or build', () => {
  const signing = { ANDROID_UPLOAD_KEYSTORE_B64: 'k', ANDROID_UPLOAD_KEYSTORE_PASSWORD: 'p', ANDROID_UPLOAD_KEY_ALIAS: 'a', ANDROID_UPLOAD_KEY_PASSWORD: 'p' };
  const ok = { ...signing, GITHUB_RUN_NUMBER: '4', MOBILE_UPLOAD: 'false' };
  assert.deepEqual(preflightProblems({ platform: 'android', env: ok, version: '0.5.1' }), []);
  const [versionProblem] = preflightProblems({ platform: 'android', env: ok, version: '0.6.0-beta' });
  assert.match(versionProblem, /Marketing version must be X\.Y\.Z for both stores: 0\.6\.0-beta/);
  assert.match(preflightProblems({ platform: 'android', env: { ...ok, MOBILE_BUILD_OFFSET: 'ten' }, version: '0.5.1' })[0], /MOBILE_BUILD_OFFSET/);
  const problems = preflightProblems({ platform: 'ios', env: { GITHUB_RUN_NUMBER: '4' }, version: 'x' });
  assert.equal(problems.length, 2, 'every problem is reported at once');
  assert.match(problems[0], /^Missing ios secrets or variables: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8_B64, APPLE_TEAM_ID/);
  assert.ok(!problems.join(' ').includes('undefined'));
});
