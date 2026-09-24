import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CARDS } from '../engine.mjs';
import * as content from '../liaozhai-cards.mjs';

const { LZ01_CARDS, LZ01_SET, LZ01_AA, LZ01_SAMPLE, LZ01_FACTIONS, LZ01_RARITIES, LZ01_DECKS } = content;
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

test('preview-only content exports have a fixed sample and one alternate-art identity', () => {
  assert.deepEqual(LZ01_SAMPLE, [
    { cardId: 'ningcaichen', treatment: 'base' },
    { cardId: 'yanchixia', treatment: 'base' },
    { cardId: 'niexiaoqian', treatment: 'aa' },
  ]);
  assert.equal(LZ01_AA.cardId, 'niexiaoqian');
  assert.equal(LZ01_AA.printId, 'lz01-001-aa1');
  for (const field of ['power', 'damage', 'stars', 'ability', 'rarity']) assert.equal(Object.hasOwn(LZ01_AA, field), false, 'Alternate art must reuse the identity rules');
  assert(Object.isFrozen(LZ01_SAMPLE));
  assert(Object.isFrozen(LZ01_AA));
  assert.equal(new Set(LZ01_CARDS.map(card => card.printId)).size, 12);
  const imagePaths = new Set([LZ01_AA.src]);
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
  assert.equal(imagePaths.size, 4, 'Three four-portrait atlases and one AA are the first slice');
  for (const path of imagePaths) {
    const bytes = readFileSync(new URL(path, root));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} must be a PNG`);
    assert(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
  }
  assert(existsSync(fileURLToPath(new URL('docs/EXPANSION-LZ01.md', root))));
});
