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
  const rule = /@media\(pointer:coarse\)\{([^{}]*)\{([^}]*)\}/.exec(styles);
  assert.ok(rule, 'a coarse-pointer rule exists');
  assert.deepEqual(rule[1].split(',').sort(), ['input', 'select', 'textarea']);
  assert.equal(rule[2], 'font-size:16px!important');
});

test('both volume sliders carry their own accessible names', () => {
  const app = read('app.mjs');
  const names = ['experience-ambience', 'experience-effects'].map(id => new RegExp(`<input id="${id}" aria-label="([^"]+)" type="range"`).exec(app)?.[1]);
  assert.ok(names.every(Boolean), 'aria-label on both sliders');
  assert.notEqual(names[0], names[1]);
});

// Review round 1 (2026-10-12): the rendered checks live in test:shell; these keep the rules in place where CI has no browser.
const rules = path => [...read(path).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({ selectors: selectors.trim().split(',').map(part => part.trim()), body }));
// Every `@media(<query>){…}` block in a file, in order; `query` is the text between `@media(` and `){`.
const mediaBlocks = (path, query) => {
  const css = read(path), blocks = [];
  for (let start = css.indexOf(`@media(${query}){`); start >= 0; start = css.indexOf(`@media(${query}){`, start + 1)) {
    let depth = 0, end = -1;
    for (let i = css.indexOf('{', start); i < css.length; i++) { depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0; if (!depth) { end = i; break; } }
    assert.ok(end >= 0, `${path}: unterminated @media(${query})`);
    blocks.push(css.slice(start, end + 1));
  }
  assert.ok(blocks.length, `${path} has @media(${query})`);
  return blocks;
};
const mediaBlock = (path, query) => mediaBlocks(path, query)[0];

test('short-landscape cards hub tabs are anchored to the shell, clear of 旅程閣', () => {
  const block = mediaBlock('scene-content.css', 'max-height:500px');
  // Anchored to the shell, #app's safe-area padding moves the tabs with the header; offsetting by the inset again would double it.
  assert.match(block, /\.shell\.game-shell\{position:relative\}/);
  const hub = /\.shell\.game-shell \.cards-hub-tabs\{([^}]*)\}/.exec(block)?.[1];
  assert.ok(hub, 'the short-landscape hub rule exists');
  assert.match(hub, /position:absolute;right:max\(25%,172px\);top:0;/);
  assert.doesNotMatch(hub, /safe-area/);
});

test('narrow phones: compact card grids shrink with the shell and market tabs wrap instead of overlapping', () => {
  const grids = /\.scene-surface \.bag-grid,\.scene-surface \.collection-grid\{grid-template-columns:repeat\(auto-fit,minmax\(([^,]+(?:,[^,)]+\))?),1fr\)\)/.exec(mediaBlock('scene-content.css', 'max-height:740px'))?.[1];
  assert.equal(grids, 'min(285px,100%)', 'a 285px track would run past a 302px screen\'s 278px shell');
  assert.match(mediaBlock('expansion.css', 'max-width:349px'), /\.scene-market>\.viewport-module-tabs\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
});

// Review round 2 (2026-10-12): Safari's toolbar-visible landscape (852×343 with a 21px home-indicator inset).
test('short-landscape market: the title shares the tab row, so the modules keep the height the lifted dock took', () => {
  // The dock stays lifted out of the home-indicator band; the market makes the room instead.
  assert.match(mediaBlock('scene-content.css', 'max-height:500px'), /\.shell\.game-shell \.game-dock\{[^}]*margin:3px auto max\(3px,var\(--safe-area-inset-bottom\)\)/);
  const block = mediaBlocks('expansion.css', 'max-height:500px) and (min-width:701px').find(css => css.includes('.scene-market{display:grid'));
  assert.ok(block, 'a short-landscape block lays the market out as a grid');
  assert.match(block, /\.scene-market\{display:grid;grid-template-columns:auto minmax\(0,1fr\);grid-template-rows:auto minmax\(0,1fr\);/);
  assert.match(block, /\.scene-market>\.scene-heading\{grid-column:1;grid-row:1;/);
  assert.match(block, /\.scene-market>\.viewport-module-tabs\{grid-column:2;grid-row:1\}/);
  assert.match(block, /\.scene-market>\[data-viewport-module\]\{grid-column:1\/-1;grid-row:2\}/);
  // 秘券's note sits beside its button rather than below it.
  assert.match(block, /\.scene-market \.expansion-ticket>div>\.primary\{grid-column:1\}\.scene-market \.expansion-ticket>div>\.expansion-small\{grid-column:2;/);
});

// Review round 3 (2026-10-12): Safari's toolbar-visible landscape on the 812pt-wide notch iPhones (812×325, 44 or 50px sides).
test('short landscape: 秘匣, 山行, the codex filters and 秘券 leave room for the lifted dock at 812×325', () => {
  const block = mediaBlocks('expansion.css', 'max-height:500px) and (min-width:701px').find(css => css.includes('.scene-market .pack-selector{align-self:start}'));
  assert.ok(block, 'a short-landscape block top-aligns 秘匣\'s picker');
  assert.match(block, /\.scene-market \.wx01-pack-progress\{justify-content:flex-start\}/);
  // The odds link sits beside the odds instead of below them.
  assert.match(block, /\.scene-market \.wx01-next-odds\{display:flex;flex-wrap:wrap;align-items:center;column-gap:8px;padding-left:0;border-left:0\}\.scene-market \.wx01-next-odds>\.wx01-small-label\{flex:0 0 100%\}/);
  assert.match(block, /\.scene-market \.expansion-ticket\{padding:6px 12px\}\.scene-market \.expansion-ticket p\{margin:3px 0\}/);
  assert.match(block, /\.scene-arena \.activity-entry\{padding:12px 16px\}\.scene-arena \.activity-entry \.primary\{padding-top:10px;padding-bottom:10px\}/);
  assert.match(block, /\.scene-surface \[data-viewport-module=filters\]\{gap:6px\}/);
});

// Review round 3 (2026-10-12): the coarse-pointer 16px is a floor, not a clamp.
test('on coarse pointers a field drawn larger than 16px keeps its size (旅程閣\'s 20px code field)', () => {
  const coarse = mediaBlock('styles.css', 'pointer:coarse');
  // Every selector whose subject is a text-entry field and which the stylesheets size above 16px, outside !important rules.
  const FIELD = /(?:^|[\s>+~])(?:input|select|textarea)(?:\[[^\]]*\]|:[\w-]+(?:\([^)]*\))?)*$/;
  const larger = publicCss.flatMap(path => rules(path).filter(rule => !rule.body.includes('!important')).flatMap(rule => {
    const size = /(?:^|;)font(?:-size)?:(\d+(?:\.\d+)?)px/.exec(rule.body)?.[1];
    return size && Number(size) > 16 ? rule.selectors.filter(selector => FIELD.test(selector)).map(selector => `${selector}{font-size:${size}px!important}`) : [];
  }));
  assert.ok(larger.includes('.account-auth input[name=token]{font-size:20px!important}'), 'the 20px one-time code field is found');
  for (const keep of larger) assert.ok(coarse.includes(keep), `the coarse-pointer block keeps ${keep}`);
});

test('touch, overscroll and card-art rules stay declared, and selection is withheld from card art only', () => {
  const declared = publicCss.flatMap(path => rules(path).map(rule => ({ path, ...rule })));
  const touch = declared.find(rule => rule.path === 'styles.css' && /(?:^|;)touch-action:manipulation(?:;|$)/.test(rule.body));
  assert.ok(touch, 'styles.css gives controls touch-action: manipulation');
  for (const selector of ['button', 'a[href]', 'input', 'select', 'textarea', 'label', 'summary', '[role="button"]', '[role="tab"]']) assert.ok(touch.selectors.includes(selector), selector);
  const viewport = rules('viewport.css');
  assert.ok(viewport.some(rule => rule.selectors.join() === 'html,body' && rule.body === 'overscroll-behavior:none'), 'no pull-to-refresh or rubber band on the document');
  assert.ok(viewport.some(rule => rule.selectors.join() === '.modal-backdrop,.modal' && rule.body === 'overscroll-behavior:contain'), 'dialogs keep their scroll');
  const ART = ['.card-art', '.card-shade', '.inheritance-material-art'];
  const callout = declared.filter(rule => /-webkit-touch-callout:none/.test(rule.body));
  assert.deepEqual(callout.map(rule => rule.selectors.join()), [ART.join()], 'the long-press callout is withheld from card art only');
  // .card (whole card faces, pre-N1) and its art may refuse selection; body text never does.
  for (const rule of declared.filter(rule => /(?:^|;)(?:-webkit-)?user-select:none/.test(rule.body))) {
    for (const selector of rule.selectors) assert.ok(['.card', ...ART].includes(selector), `${rule.path}: user-select:none on ${selector}`);
  }
});
