import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CARDS } from '../engine.mjs';
import { PRINT_TREATMENTS } from '../card-presentation.mjs';
import * as content from '../liaozhai-cards.mjs';

const { LZ01_CARDS, LZ01_SET, LZ01_SPECIALS, LZ01_PLANNED_SPECIALS, LZ01_TREATMENTS, LZ01_SAMPLE, LZ01_FACTIONS, LZ01_RARITIES, LZ01_DECKS } = content;
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const ids = ['niexiaoqian', 'ningcaichen', 'yanchixia', 'yingning', 'wangzifu', 'lupan', 'zhuerdan', 'huapi', 'chenshi', 'huapidaoshi', 'wangliulang', 'xuyuren'];
const count = field => Object.fromEntries([...new Set(LZ01_CARDS.map(card => card[field]))].sort().map(value => [value, LZ01_CARDS.filter(card => card[field] === value).length]));
const effects = new Set(['power', 'opponentPower', 'attack', 'opponentAttack', 'damage', 'reduceDamage', 'stopAbility', 'healOnWin', 'refundOnLoss']);

test('LZ01 preview has twelve stable identities, balanced faction counts and the agreed rarity mix', () => {
  assert.deepEqual(LZ01_CARDS.map(card => card.id), ids);
  assert.equal(new Set(LZ01_CARDS.map(card => card.name)).size, 12);
  assert.deepEqual(count('faction'), { ember: 3, grove: 3, moon: 3, yun: 3 });
  assert.deepEqual(count('rarity'), { common: 6, epic: 2, rare: 4 });
  for (const card of LZ01_CARDS) {
    assert(Object.hasOwn(LZ01_FACTIONS, card.faction), card.id);
    assert(Object.hasOwn(LZ01_RARITIES, card.rarity), card.id);
    assert(Number.isInteger(card.stars) && card.stars >= 2 && card.stars <= 4, card.id);
    assert(Number.isInteger(card.power) && card.power >= 1 && card.power <= 8, card.id);
    assert(Number.isInteger(card.damage) && card.damage >= 1 && card.damage <= 7, card.id);
    assert(effects.has(card.ability.type), `${card.id} must use an existing effect`);
    assert(Number.isInteger(card.ability.value) && card.ability.value >= 0, card.id);
    assert.equal(Object.hasOwn(card.ability, 'condition'), false, '餘願 is a later engine experiment');
    assert(Object.isFrozen(card) && Object.isFrozen(card.ability), `${card.id} must be immutable preview data`);
  }
  assert(Object.isFrozen(LZ01_CARDS));
  assert.equal(LZ01_SET.id, 'lz01');
});

test('new candidate identities stay outside the live game and avoid obvious raw same-role upgrades', () => {
  for (const candidate of LZ01_CARDS) {
    assert.equal(CARDS.some(card => card.id === candidate.id), false, `${candidate.id} leaked into the live rules roster`);
    for (const old of CARDS) {
      if (candidate.faction !== old.faction || candidate.ability.type !== old.ability.type || candidate.stars > old.stars) continue;
      const noWorse = candidate.power >= old.power && candidate.damage >= old.damage && candidate.ability.value >= old.ability.value;
      const improved = candidate.stars < old.stars || candidate.power > old.power || candidate.damage > old.damage || candidate.ability.value > old.ability.value;
      assert.equal(noWorse && improved, false, `${candidate.id} strictly upgrades ${old.id}; this is not a full balance test`);
    }
  }
  const zhu = LZ01_CARDS.find(card => card.id === 'zhuerdan');
  assert.deepEqual([zhu.stars, zhu.power, zhu.damage, zhu.ability.type, zhu.ability.value], [3, 5, 5, 'power', 2], 'Do not regress to the rejected strictly weaker 5/4 prototype');
});

test('paper deck examples have eight distinct known identities within the unchanged 25-star budget', () => {
  assert(Array.isArray(LZ01_DECKS) && LZ01_DECKS.length >= 2);
  const all = new Map([...CARDS, ...LZ01_CARDS].map(card => [card.id, card]));
  for (const deck of LZ01_DECKS) {
    assert.equal(typeof deck.name, 'string');
    assert.equal(deck.ids.length, 8, deck.name);
    assert.equal(new Set(deck.ids).size, 8, deck.name);
    const total = deck.ids.reduce((sum, id) => {
      assert(all.has(id), `${deck.name}: unknown ${id}`);
      return sum + all.get(id).stars;
    }, 0);
    assert(total <= 25, `${deck.name}: ${total} stars`);
    if (Object.hasOwn(deck, 'stars')) assert.equal(deck.stars, total);
  }
});

test('the preview module graph cannot import game, profile, progression, account or sampling code', () => {
  const visited = new Set();
  const allowed = new Set(['liaozhai.mjs', 'liaozhai-cards.mjs']);
  function visit(path) {
    assert(allowed.has(path), `Unexpected preview dependency: ${path}`);
    if (visited.has(path)) return;
    visited.add(path);
    const source = read(path);
    const imports = [...source.matchAll(/(?:\bimport\s*(?:[^'";]*?\bfrom\s*)?|\bexport\s+[^'";]*?\bfrom\s*|\bimport\s*\()(['"])([^'"]+)\1/g)];
    for (const [, , specifier] of imports) {
      assert(specifier.startsWith('./'), `Only the isolated local content module is allowed: ${specifier}`);
      visit(specifier.slice(2));
    }
  }
  const html = read('liaozhai.html');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+)['"]/g)].map(match => match[1].replace(/^\.\//, ''));
  assert.deepEqual(scripts, ['liaozhai.mjs']);
  visit('liaozhai.mjs');
  assert(visited.has('liaozhai-cards.mjs'));
  const dataSource = read('liaozhai-cards.mjs');
  assert.doesNotMatch(dataSource, /\b(?:Math\.random|crypto\.getRandomValues)\s*\(/, 'The showcase selection must not sample');
  assert.doesNotMatch(read('liaozhai.mjs'), /\b(?:Math\.random|crypto\.getRandomValues)\s*\(/, 'Repeated opening must stay fixed');
  const allowlist = JSON.parse(read('hosting/public-assets.json'));
  assert.doesNotMatch(JSON.stringify(allowlist), /liaozhai|assets\/lz01/, 'The standalone preview is not a public release');
});

test('preview-only content exports have a fixed sample and bind only the selected special printings', () => {
  assert.deepEqual(LZ01_SAMPLE, [
    { cardId: 'ningcaichen', treatment: 'base' },
    { cardId: 'yanchixia', treatment: 'base' },
    { cardId: 'niexiaoqian', treatment: 'aa' },
  ]);
  assert(Object.isFrozen(LZ01_SAMPLE));
  assert.equal(new Set(LZ01_CARDS.map(card => card.printId)).size, 12);
  const imagePaths = new Set();
  for (const card of LZ01_CARDS) {
    assert.match(card.printId, /^lz01-\d{3}-base$/);
    const { src, columns, rows, index } = card.art;
    assert.match(src, /^assets\/lz01\/[a-z0-9-]+\.png$/);
    assert(Number.isInteger(columns) && columns > 0);
    assert(Number.isInteger(rows) && rows > 0);
    assert(Number.isInteger(index) && index >= 0 && index < columns * rows);
    imagePaths.add(src);
    const source = new URL(card.sourceUrl);
    assert.equal(source.origin, 'https://zh.wikisource.org');
    assert.equal(decodeURIComponent(source.hash.slice(1)), card.story);
  }
  assert.equal(imagePaths.size, 3, 'Three four-portrait BASE atlases');

  for (const [treatment, copy] of Object.entries(LZ01_TREATMENTS)) assert.deepEqual(copy, PRINT_TREATMENTS[treatment], `${treatment} copy drifted from the game labels`);
  assert.deepEqual(LZ01_SPECIALS.map(print => [print.printId, print.src]), [
    ['lz01-001-aa1', 'assets/lz01/xiaoqian-aa.png'],
    ['lz01-001-tr1', 'assets/lz01/xiaoqian-treasure.png'],
    ['lz01-008-ink1', 'assets/lz01/huapi-ink.png'],
    ['lz01-009-aa1', 'assets/lz01/chenshi-aa.png'],
    ['lz01-011-aa1', 'assets/lz01/liulang-aa.png'],
  ], 'Bind only selected files; 小倩 AA stays first');
  assert.deepEqual(LZ01_PLANNED_SPECIALS.map(print => print.printId), ['lz01-004-aa1', 'lz01-006-ink1'], '嬰寧 AA was unbound after the card-fit review; 陸判 INK has no selected image');
  const code = { aa: 'aa', ink: 'ink', treasure: 'tr' };
  const all = [...LZ01_SPECIALS, ...LZ01_PLANNED_SPECIALS];
  assert.equal(LZ01_CARDS.length + all.length, 19, 'The set checklist is 12 BASE + 4 AA + 2 INK + 1 TR');
  assert.equal(new Set(all.map(print => print.printId)).size, all.length);
  assert.equal(new Set(all.map(print => `${print.cardId}:${print.treatment}`)).size, all.length, 'Lookups by card and treatment must not collide');
  for (const print of all) {
    const card = LZ01_CARDS.find(item => item.id === print.cardId);
    assert(card, print.printId);
    const match = print.printId.match(/^lz01-(\d{3})-(aa|ink|tr)1$/);
    assert(match, print.printId);
    assert.equal(`lz01-${match[1]}-base`, card.printId, `${print.printId} must reuse its card number`);
    assert.equal(match[2], code[print.treatment], print.printId);
    assert.equal(print.name, `${card.name.replace(/（.*）$/, '')} · ${print.title}`);
    for (const field of ['power', 'damage', 'stars', 'ability', 'rarity']) assert.equal(Object.hasOwn(print, field), false, 'Special printings reuse the identity rules');
    assert(Object.isFrozen(print));
  }
  for (const print of LZ01_SPECIALS) {
    assert.deepEqual(Object.keys(print), ['cardId', 'printId', 'treatment', 'name', 'title', 'src', 'label']);
    assert.match(print.src, /^assets\/lz01\/[a-z0-9-]+\.png$/);
    assert.equal(print.label, `${LZ01_TREATMENTS[print.treatment].name} ${LZ01_TREATMENTS[print.treatment].code}`);
    const bytes = readFileSync(new URL(print.src, root));
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1024, 1536], `${print.src} must stay the untouched 1024x1536 original`);
    imagePaths.add(print.src);
  }
  for (const print of LZ01_PLANNED_SPECIALS) assert.equal(Object.hasOwn(print, 'src'), false, `${print.printId} is planned, not bound`);
  assert(Object.isFrozen(LZ01_SPECIALS) && Object.isFrozen(LZ01_PLANNED_SPECIALS) && Object.isFrozen(LZ01_TREATMENTS));
  assert.equal(imagePaths.size, 8, 'Three atlases and five bound special printings');

  const preview = new Set(JSON.parse(read('hosting/preview-assets.json')));
  const publicAssets = new Set(JSON.parse(read('hosting/public-assets.json')));
  const recorded = new Map([...read('docs/ART-LZ01.md').matchAll(/^\| `([a-z0-9-]+\.png)` \| `([0-9a-f]{64})` \|$/gm)].map(match => [match[1], match[2]]));
  for (const path of imagePaths) {
    const bytes = readFileSync(new URL(path, root));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} must be a PNG`);
    assert(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
    assert(preview.has(path), `${path} must be in the preview allowlist`);
    assert.equal(publicAssets.has(path), false, `${path} must stay out of the public build`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), recorded.get(path.split('/').at(-1)), `${path} must match its recorded SHA-256 in docs/ART-LZ01.md`);
  }
  // A PNG kept in the tree but not bound (嬰寧 AA since 2026-10-11) keeps its recorded hash and is served by neither list.
  for (const name of readdirSync(new URL('assets/lz01/', root)).filter(file => file.endsWith('.png'))) {
    const path = `assets/lz01/${name}`;
    if (imagePaths.has(path)) continue;
    assert.equal(createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex'), recorded.get(name), `${path} must match its recorded SHA-256 in docs/ART-LZ01.md`);
    assert.equal(preview.has(path) || publicAssets.has(path), false, `${path} is not bound, so no allowlist may serve it`);
  }
  for (const path of preview) if (path.startsWith('assets/lz01/')) assert(imagePaths.has(path), `${path} is allowlisted but not bound`);
  assert(existsSync(fileURLToPath(new URL('docs/EXPANSION-LZ01.md', root))));
});
