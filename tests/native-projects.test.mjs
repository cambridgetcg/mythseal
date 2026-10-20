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

// The iOS project as the first TestFlight build needs it (docs/IOS-FIRST-FLIGHT.md, step 6).
// Text checks, because CI runs on Linux without plutil; `plutil -lint` ran on a Mac.
const plistArray = (plist, key) => {
  const match = plist.match(new RegExp(`<key>${key.replace(/[~]/g, '\\$&')}</key>\\s*<array>([\\s\\S]*?)</array>`));
  return match ? [...match[1].matchAll(/<string>([^<]*)<\/string>/g)].map(item => item[1]) : null;
};

test('iOS conforms for a first TestFlight build: iOS 16, iPhone only, portrait, zh-Hant, no encryption, arm64', () => {
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.ok(pbx.startsWith('// !$*UTF8*$!'), 'the classic project.pbxproj format, never converted (cap sync cannot read the JSON .xcproj)');
  const targets = [...pbx.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);/g)].map(match => match[1]);
  assert.deepEqual(targets, ['16.0', '16.0', '16.0', '16.0'], 'Web Locks need 15.4; Capacitor 9 needs 16; the first occurrence also sets CapApp-SPM');
  assert.deepEqual([...pbx.matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/g)].map(match => match[1]), ['1', '1'], 'iPhone only until iPad layouts are checked');
  assert.match(pbx, /developmentRegion = "zh-Hant";/);
  assert.match(read('ios/App/CapApp-SPM/Package.swift'), /platforms: \[\.iOS\(\.v16\)\]/);
  const plist = read('ios/App/App/Info.plist');
  assert.deepEqual(plistArray(plist, 'UISupportedInterfaceOrientations'), ['UIInterfaceOrientationPortrait'], 'landscape below 701 px is an open fault (RELEASE-NEXT §12 item 17)');
  assert.equal(plistArray(plist, 'UISupportedInterfaceOrientations~ipad'), null);
  assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/, 'only the OS\'s HTTPS and crypto.randomUUID; no encryption of our own');
  assert.deepEqual(plistArray(plist, 'UIRequiredDeviceCapabilities'), ['arm64']);
  assert.match(plist, /<key>CFBundleDevelopmentRegion<\/key>\s*<string>zh-Hant<\/string>/);
  assert.deepEqual(plistArray(plist, 'CFBundleLocalizations'), ['zh-Hant'], 'the game ships Traditional Chinese only');
  // UIScene life cycle (required to launch under the iOS 27 SDK): the manifest and the delegate.
  assert.match(plist, /<key>UISceneDelegateClassName<\/key>\s*<string>\$\(PRODUCT_MODULE_NAME\)\.SceneDelegate<\/string>/);
  assert.match(read('ios/App/App/SceneDelegate.swift'), /class SceneDelegate: UIResponder, UIWindowSceneDelegate/);
});

test('the app privacy manifest is in the bundle and declares the file-timestamp API the Filesystem plugin uses', () => {
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  const ref = pbx.match(/([0-9A-F]{24}) \/\* PrivacyInfo\.xcprivacy \*\/ = \{isa = PBXFileReference; lastKnownFileType = text\.xml; path = PrivacyInfo\.xcprivacy; sourceTree = "<group>"; \};/);
  assert.ok(ref, 'a file reference in the App group');
  const build = pbx.match(new RegExp(`([0-9A-F]{24}) /\\* PrivacyInfo\\.xcprivacy in Resources \\*/ = \\{isa = PBXBuildFile; fileRef = ${ref[1]} `));
  assert.ok(build, 'a build file');
  const resources = pbx.match(/\/\* Resources \*\/ = \{\s*isa = PBXResourcesBuildPhase;[\s\S]*?files = \(([\s\S]*?)\);/)[1];
  assert.ok(resources.includes(`${build[1]} /* PrivacyInfo.xcprivacy in Resources */`), "in the App target's Resources phase");
  const manifest = read('ios/App/App/PrivacyInfo.xcprivacy');
  assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(manifest, /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/, 'no data collected');
  assert.match(manifest, /<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
  // @capacitor/filesystem 8.1.5 and ion-ios-filesystem 2.0.1 ship no manifest of their own; the
  // plugin's README asks the app to declare this (its stat reads creation and modification dates).
  assert.match(manifest, /<string>NSPrivacyAccessedAPICategoryFileTimestamp<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>\s*<string>C617\.1<\/string>\s*<\/array>/);
});

test('the Swift package pins the same Capacitor as package.json and includes the two plugins', () => {
  const pkg = JSON.parse(read('package.json')).devDependencies;
  const swift = read('ios/App/CapApp-SPM/Package.swift');
  assert.match(swift, new RegExp(`capacitor-swift-pm\\.git", exact: "${pkg['@capacitor/ios'].replace(/\./g, '\\.')}"`));
  for (const name of ['@capacitor/core', '@capacitor/cli', '@capacitor/ios', '@capacitor/android', '@capacitor/filesystem', '@capacitor/share']) assert.match(pkg[name], /^\d+\.\d+\.\d+$/, `${name} is pinned exactly`);
  assert.equal(pkg['@capacitor/ios'], '8.5.3');
  for (const product of ['CapacitorFilesystem', 'CapacitorShare']) assert.match(swift, new RegExp(`\\.product\\(name: "${product}", package: "${product}"\\)`));
});

test('Xcode Cloud runs the rendered post-clone script: fence, Node 24, tests, the store build, cap sync', () => {
  const path = 'ios/App/ci_scripts/ci_post_clone.sh', script = read(path);
  // Xcode Cloud finds ci_scripts next to the project and runs a script only if it is executable.
  assert.match(execFileSync('git', ['ls-files', '--stage', path], { encoding: 'utf8' }), /^100755 /, 'committed executable');
  assert.ok(script.startsWith('#!/bin/sh\n'));
  assert.doesNotMatch(script, /\{\{/, 'fully rendered from orchard\'s template');
  const steps = ['set -eu', 'cd "$CI_PRIMARY_REPOSITORY_PATH"', 'git fetch --unshallow', 'git merge-base --is-ancestor 7a7d03e HEAD', 'brew install node@24', 'npm ci', 'npm test', 'npm run build:native', 'ORCHARD_PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"', 'npx cap sync ios'];
  let at = -1;
  for (const step of steps) { const next = script.indexOf(step, at + 1); assert.ok(next > at, `${step} runs, in order`); at = next; }
  assert.doesNotMatch(script, /\$\{\{\s*secrets|ASC_|\.p8\b|\bsecurity (?:find|add)|_KEY=/, 'Apple signs in the cloud: no key or secret here');
});
