// N1 mobile shell: static guards for the parts CI can check without a browser.
// tools/shell-smoke.mjs (npm run test:shell) measures the rendered behavior.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const publicCss = JSON.parse(read('hosting/public-assets.json')).filter(path => path.endsWith('.css'));
const SIDES = ['top', 'right', 'bottom', 'left'];

test('the game viewport covers the screen without disabling zoom', () => {
  const meta = /<meta name="viewport" content="([^"]+)">/.exec(read('index.html'))?.[1];
  assert.ok(meta, 'index.html has a viewport meta');
  const parts = meta.split(',').map(part => part.trim());
  for (const part of ['width=device-width', 'initial-scale=1', 'viewport-fit=cover']) assert.ok(parts.includes(part), part);
  assert.ok(!/maximum-scale|minimum-scale|user-scalable/.test(meta), 'players can still pinch-zoom');
});

test('safe-area insets are read from env() once, as overridable custom properties', () => {
  const uses = publicCss.flatMap(path => [...read(path).matchAll(/env\(\s*safe-area-inset-([a-z]+)[^)]*\)/g)].map(match => ({ path, side: match[1], at: match.index })));
  assert.deepEqual(uses.map(use => `${use.path}:${use.side}`), SIDES.map(side => `styles.css:${side}`));
  const styles = read('styles.css');
  for (const side of SIDES) {
    const definitions = publicCss.flatMap(path => [...read(path).matchAll(new RegExp(`--safe-area-inset-${side}\\s*:`, 'g'))].map(() => path));
    assert.deepEqual(definitions, ['styles.css'], `--safe-area-inset-${side} is defined once`);
    assert.match(styles, new RegExp(`:root\\{[^}]*--safe-area-inset-${side}:env\\(safe-area-inset-${side},0px\\)`), `${side} defaults to env() on :root`);
  }
  assert.match(styles, /--safe-viewport-height:calc\(100dvh - var\(--safe-area-inset-top\) - var\(--safe-area-inset-bottom\)\)/);
  // Dialog and card heights subtract from the safe height; only that definition subtracts from 100dvh.
  for (const path of publicCss) assert.ok(!/100dvh\s*-/.test(read(path).replace('--safe-viewport-height:calc(100dvh -', '')), `${path}: use --safe-viewport-height`);
});

test('narrow phones are not given a wider page', () => {
  for (const path of publicCss) {
    for (const [, body] of read(path).matchAll(/(?:^|[{}\s,])body\{([^}]*)\}/g)) {
      const width = /(?:^|;)min-width:(\d+)px/.exec(body)?.[1];
      assert.ok(!width || Number(width) <= 302, `${path}: body min-width ${width}px is wider than a 302px screen`);
    }
  }
});

test('text entry is at least 16px on coarse pointers, so iOS does not zoom on focus', () => {
  const styles = read('styles.css');
  const rule = /@media\(pointer:coarse\)\{([^{}]*)\{([^}]*)\}\}/.exec(styles);
  assert.ok(rule, 'a coarse-pointer rule exists');
  assert.deepEqual(rule[1].split(',').sort(), ['input', 'select', 'textarea']);
  assert.match(rule[2], /font-size:16px!important/);
});

test('both volume sliders carry their own accessible names', () => {
  const app = read('app.mjs');
  const names = ['experience-ambience', 'experience-effects'].map(id => new RegExp(`<input id="${id}" aria-label="([^"]+)" type="range"`).exec(app)?.[1]);
  assert.ok(names.every(Boolean), 'aria-label on both sliders');
  assert.notEqual(names[0], names[1]);
});
