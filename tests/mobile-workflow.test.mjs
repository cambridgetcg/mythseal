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

test('secrets reach only the steps that need them, never npm, tests or cap sync', () => {
  // Job-level env sits at six spaces; step-level env at ten. Dependencies' install scripts and
  // tests run in steps without these, so they cannot read a secret from the environment.
  assert.deepEqual(workflow.split('\n').filter(line => /^ {6}\w+: \$\{\{ secrets\./.test(line)), []);
  const steps = workflow.split(/\n(?= {6}- name: )/);
  for (const step of steps.filter(text => /\$\{\{ secrets\./.test(text))) {
    assert.match(step, /^ {6}- name: (Check the signing secrets|Decode the App Store Connect key|Decode the upload keystore|Build, sign and \(if uploading\) send to (TestFlight|Play internal testing))\n/, step.split('\n')[0]);
  }
});

test('only a tag push or an explicit upload input turns uploading on', () => {
  assert.match(workflow, /\n  MOBILE_UPLOAD: \$\{\{ github\.event_name == 'push' \|\| inputs\.upload == true \}\}\n/);
  assert.equal(workflow.match(/MOBILE_UPLOAD:/g)?.length, 1, 'set once, at workflow level');
});

test('both jobs check the release fence on full history before anything is built or signed', () => {
  for (const job of ['ios', 'android']) {
    const body = workflow.slice(workflow.indexOf(`\n  ${job}:\n`), job === 'ios' ? workflow.indexOf('\n  android:\n') : undefined);
    assert.match(body, /persist-credentials: false\n {10}# Full history, for the release fence\.\n {10}fetch-depth: 0\n/, `${job}: full history`);
    const fence = body.indexOf('run: git merge-base --is-ancestor 7a7d03e HEAD');
    assert.ok(fence > body.indexOf('Check out source') && fence < body.indexOf('preflight') && fence < body.indexOf('npm ci'), `${job}: fence right after checkout`);
  }
});

test('iOS builds with one pinned Xcode, selected per command and asserted', () => {
  const ios = workflow.slice(workflow.indexOf('\n  ios:\n'), workflow.indexOf('\n  android:\n'));
  assert.match(ios, /\n {6}DEVELOPER_DIR: \/Applications\/Xcode_26\.6\.app\/Contents\/Developer\n/, 'job-level, so every step uses it');
  assert.match(ios, /test "\$\(xcodebuild -version \| head -1\)" = "Xcode 26\.6"/, 'and the run fails if the image no longer has it');
  assert.doesNotMatch(workflow, /^\s+(?:run: )?sudo |xcode-select -s/m, 'no machine-wide switch');
});
