// Static guards for the committed Capacitor projects: identity, SPM (no CocoaPods),
// version hooks the lanes set, signing only from the environment, no secrets in Git.
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('both projects carry the configured identity', () => {
  const { appId } = JSON.parse(read('capacitor.config.json'));
  assert.equal(appId, 'com.mythseal.game');
  assert.match(read('android/app/build.gradle'), /applicationId "com\.mythseal\.game"/);
  assert.match(read('ios/App/App.xcodeproj/project.pbxproj'), /PRODUCT_BUNDLE_IDENTIFIER = com\.mythseal\.game;/);
});

test('iOS uses Swift Package Manager and takes its versions from build settings', () => {
  assert.equal(existsSync(new URL('../ios/App/Podfile', import.meta.url)), false, 'no CocoaPods');
  // Capacitor 8's SPM template; if the generated package lives elsewhere, pin that path here.
  assert.ok(existsSync(new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url)), 'SPM package');
  const plist = read('ios/App/App/Info.plist');
  assert.match(plist, /<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/);
  assert.match(plist, /<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/);
});

test('Android takes versions from Gradle properties and signs only from the environment', () => {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /versionCode Integer\.parseInt\(\(project\.findProperty\('mythsealVersionCode'\) \?: '1'\)\.toString\(\)\)/);
  assert.match(gradle, /versionName \(project\.findProperty\('mythsealVersionName'\) \?: '0\.0\.0'\)\.toString\(\)/);
  for (const name of ['MYTHSEAL_UPLOAD_KEYSTORE', 'ANDROID_UPLOAD_KEYSTORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD']) {
    assert.match(gradle, new RegExp(`System\\.getenv\\('${name}'\\)`), name);
  }
  assert.match(gradle, /if \(System\.getenv\('MYTHSEAL_UPLOAD_KEYSTORE'\)\) \{\s*signingConfig signingConfigs\.upload/);
});

test('no signing material or copied web bundle is tracked', () => {
  const tracked = execFileSync('git', ['ls-files', 'ios', 'android'], { encoding: 'utf8' }).split('\n');
  assert.deepEqual(tracked.filter(path => /\.(p8|p12|jks|keystore|mobileprovision)$/.test(path)), []);
  assert.deepEqual(tracked.filter(path => /(^|\/)public\//.test(path)), [], 'cap sync output stays ignored');
});

test('the App scheme is shared, so xcodebuild -scheme App works on a fresh runner', () => {
  const scheme = read('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme');
  assert.match(scheme, /BuildableName = "App\.app"/);
  assert.match(scheme, /<ArchiveAction\s+buildConfiguration = "Release"/);
});
