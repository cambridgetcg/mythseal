import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const fastfile = readFileSync(new URL('../fastlane/Fastfile', import.meta.url), 'utf8');

test('lanes read the app identity from capacitor.config.json, not literals', () => {
  assert.match(fastfile, /capacitor\.config\.json/);
  assert.doesNotMatch(fastfile, /com\.mythseal\.game/);
});

test('uploads happen only when MOBILE_UPLOAD is true, and only to internal testing', () => {
  assert.match(fastfile, /ENV\["MOBILE_UPLOAD"\] == "true"/);
  assert.match(fastfile, /upload_to_testflight\([^)]*distribute_external: false/s);
  assert.match(fastfile, /upload_to_play_store\([^)]*track: "internal"/s);
  assert.doesNotMatch(fastfile, /track: "(?:alpha|beta|production)"/);
  assert.match(fastfile, /release_status: ENV\.fetch\("PLAY_RELEASE_STATUS", "draft"\)/);
});

test('Gemfile pins fastlane exactly', () => {
  assert.match(readFileSync(new URL('../Gemfile', import.meta.url), 'utf8'), /gem "fastlane", "2\.240\.1"/);
});
