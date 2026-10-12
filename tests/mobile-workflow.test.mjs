// Text guards for the mobile workflow's safety properties (the repo has no YAML parser).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/mobile.yml', import.meta.url), 'utf8');

test('runs only on manual dispatch (dry by default) or mobile-v* tags', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:\n    inputs:\n      upload:\n[\s\S]*?type: boolean\n        default: false\n  push:\n    tags: \['mobile-v\*'\]\n/);
  assert.doesNotMatch(workflow, /\n  pull_request:|\n  schedule:/);
});

test('read-only token, never cancels an upload mid-flight, secrets only from mobile-stores', () => {
  assert.match(workflow, /\npermissions:\n  contents: read\n/);
  assert.match(workflow, /concurrency:\n  group: mobile-\$\{\{ github\.ref \}\}\n  cancel-in-progress: false\n/);
  assert.equal(workflow.match(/environment: mobile-stores/g)?.length, 2);
});

test('every action is pinned to a full commit SHA', () => {
  const uses = [...workflow.matchAll(/uses: ([^\s]+)/g)].map(match => match[1]);
  assert.ok(uses.length >= 8);
  for (const use of uses) assert.match(use, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, use);
});

test('runners, timeouts and preflight-before-build', () => {
  assert.match(workflow, /ios:\n    runs-on: macos-26\n    timeout-minutes: 45\n/);
  assert.match(workflow, /android:\n    runs-on: ubuntu-24\.04\n    timeout-minutes: 30\n/);
  for (const platform of ['ios', 'android']) {
    const preflight = workflow.indexOf(`node tools/mobile-release.mjs preflight ${platform}`);
    const install = workflow.indexOf('npm ci', preflight);
    assert.ok(preflight > 0 && install > preflight, `${platform}: preflight runs before npm ci`);
  }
});

test('decoded keys are removed even when a step fails', () => {
  assert.match(workflow, /- name: Remove the App Store Connect key\n        if: always\(\)\n        run: rm -f "\$RUNNER_TEMP"\/AuthKey_\*\.p8/);
  assert.match(workflow, /- name: Remove the upload keystore\n        if: always\(\)\n        run: rm -f "\$RUNNER_TEMP\/upload\.keystore"/);
  assert.doesNotMatch(workflow, /set -x|echo "\$\{?(?:ASC_KEY_P8_B64|ANDROID_UPLOAD|PLAY_SERVICE)/);
});
