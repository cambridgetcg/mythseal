import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CARDS, getCard } from '../engine.mjs';
import { CARD_RARITIES } from '../progression.mjs';
import { HL01_SET, HL01_CARDS, HL01_AA, HL01_SAMPLE, HL01_DECKS, HL01_FACTIONS, HL01_RARITIES } from '../honglou-cards.mjs';

const ids = ['lindaiyu', 'jiabaoyu', 'xuebaochai', 'shixiangyun', 'jiatanchun', 'liwan', 'jiayingchun', 'jiaxichun'];
const source37 = 'https://zh.wikisource.org/wiki/紅樓夢/第037回';
const source62 = 'https://zh.wikisource.org/wiki/紅樓夢/第062回';
const effects = new Set(['power', 'opponentPower', 'attack', 'opponentAttack', 'damage', 'reduceDamage', 'stopAbility', 'healOnWin', 'refundOnLoss']);
const count = field => Object.fromEntries([...new Set(HL01_CARDS.map(card => card[field]))].sort().map(value => [value, HL01_CARDS.filter(card => card[field] === value).length]));
const root = new URL('../', import.meta.url);

test('HL01 contains the eight stable literary identities, two per faction and only existing effects', () => {
  assert.equal(HL01_SET.id, 'hl01');
  assert.deepEqual(HL01_CARDS.map(card => card.id), ids);
  assert.equal(new Set(HL01_CARDS.map(card => card.name)).size, 8);
  assert.deepEqual(count('faction'), { ember: 2, grove: 2, moon: 2, yun: 2 });
  assert.deepEqual(count('rarity'), { common: 4, rare: 4 });
  for (const card of HL01_CARDS) {
    assert(Object.hasOwn(HL01_FACTIONS, card.faction), card.id);
    assert(Object.hasOwn(HL01_RARITIES, card.rarity), card.id);
    assert(Number.isInteger(card.stars) && card.stars >= 2 && card.stars <= 3, card.id);
    assert(Number.isInteger(card.power) && card.power >= 1 && card.power <= 8, card.id);
    assert(Number.isInteger(card.damage) && card.damage >= 1 && card.damage <= 6, card.id);
    assert(effects.has(card.ability.type), card.id);
    assert(Number.isInteger(card.ability.value) && card.ability.value >= 0, card.id);
    assert.equal(Object.hasOwn(card.ability, 'condition'), false, 'No new conditional mechanic is part of the preview');
    assert(Object.isFrozen(card) && Object.isFrozen(card.ability) && Object.isFrozen(card.art));
  }
  for (const value of [HL01_SET, HL01_CARDS, HL01_AA, HL01_SAMPLE, HL01_DECKS, HL01_FACTIONS, HL01_RARITIES]) assert(Object.isFrozen(value));
});

test('Daiyu is an exact existing identity reprint; seven candidates and Xifeng stay outside this set/game boundary', () => {
  const original = getCard('lindaiyu');
  const reprint = HL01_CARDS[0];
  assert.equal(reprint.reprintOf, 'lindaiyu');
  for (const field of ['id', 'name', 'title', 'source', 'faction', 'stars', 'power', 'damage', 'ability', 'lore']) {
    assert.deepEqual(reprint[field], original[field], `Daiyu's ${field} must not change for a new illustration`);
  }
  assert.equal(reprint.rarity, CARD_RARITIES.lindaiyu);
  assert.equal(CARDS.filter(card => card.id === 'lindaiyu').length, 1);
  assert.equal(HL01_CARDS.filter(card => Object.hasOwn(card, 'reprintOf')).length, 1);
  for (const candidate of HL01_CARDS.slice(1)) assert.equal(CARDS.some(card => card.id === candidate.id), false, `${candidate.id} leaked into the live engine`);
  assert.equal(HL01_CARDS.some(card => card.id === 'wangxifeng'), false, 'An existing hypothetical deck partner is not a poetry-room printing');
  assert.equal(getCard('wangxifeng').name, '王熙鳳');
});

test('candidate budgets avoid obvious equal-or-lower-cost same-faction/effect strict upgrades', () => {
  for (const candidate of HL01_CARDS.slice(1)) for (const old of CARDS) {
    if (candidate.faction !== old.faction || candidate.ability.type !== old.ability.type || candidate.stars > old.stars) continue;
    const noWorse = candidate.power >= old.power && candidate.damage >= old.damage && candidate.ability.value >= old.ability.value;
    const improved = candidate.stars < old.stars || candidate.power > old.power || candidate.damage > old.damage || candidate.ability.value > old.ability.value;
    assert.equal(noWorse && improved, false, `${candidate.id} strictly upgrades ${old.id}; this guard is not a full balance model`);
  }
});

test('chapter 37 roles stay distinct and the sleeping Xiangyun artwork points to chapter 62', () => {
  assert.deepEqual(HL01_SET.sources.map(source => source.url), [source37, source62]);
  for (const card of HL01_CARDS) {
    assert.equal(card.sourceUrl, source37);
    assert.equal(card.story, '海棠詩社');
    assert(card.role.length > 0 && card.roleDetail.length > 0);
  }
  const roles = Object.fromEntries(HL01_CARDS.map(card => [card.id, card.role]));
  assert.equal(roles.jiatanchun, '發起');
  assert.equal(roles.liwan, '掌壇');
  assert.equal(roles.jiayingchun, '限韻');
  assert.equal(roles.jiaxichun, '監場');
  assert.match(HL01_CARDS.find(card => card.id === 'shixiangyun').roleDetail, /次日.*兩首/);
  assert.equal(HL01_AA.find(print => print.cardId === 'shixiangyun').sourceUrl, source62);
  for (const source of [...HL01_SET.sources.map(value => value.url), ...HL01_CARDS.map(card => card.sourceUrl), ...HL01_AA.map(print => print.sourceUrl)]) {
    const url = new URL(source);
    assert.equal(url.origin, 'https://zh.wikisource.org');
    assert.match(decodeURIComponent(url.pathname), /^\/wiki\/紅樓夢\/第0(?:37|62)回$/);
  }
});

test('two atlas maps and three immutable AA printings reuse their identity stats and fixed reveal order', () => {
  assert.equal(new Set(HL01_CARDS.map(card => card.printId)).size, 8);
  HL01_CARDS.forEach((card, index) => {
    assert.equal(card.printId, `hl01-${String(index + 1).padStart(3, '0')}-base`);
    assert.deepEqual(card.art, { src: `assets/hl01/base-0${Math.floor(index / 4) + 1}.png`, columns: 2, rows: 2, index: index % 4 });
  });
  assert.deepEqual(HL01_AA.map(print => [print.cardId, print.printId, print.src]), [
    ['lindaiyu', 'hl01-001-aa1', 'assets/hl01/daiyu-aa.png'],
    ['shixiangyun', 'hl01-004-aa1', 'assets/hl01/xiangyun-aa.png'],
    ['jiatanchun', 'hl01-005-aa1', 'assets/hl01/tanchun-aa.png'],
  ]);
  assert.deepEqual(HL01_AA.map(print => print.name), ['林黛玉 · 雨停之前', '史湘雲 · 花影留眠', '賈探春 · 一紙相邀']);
  for (const print of HL01_AA) {
    assert(Object.isFrozen(print));
    assert(HL01_CARDS.some(card => card.id === print.cardId));
    for (const field of ['power', 'damage', 'stars', 'ability', 'rarity']) assert.equal(Object.hasOwn(print, field), false, `${print.printId} must reuse base rules`);
  }
  assert.deepEqual(HL01_SAMPLE, [
    { cardId: 'jiabaoyu', treatment: 'base' },
    { cardId: 'shixiangyun', treatment: 'base' },
    { cardId: 'lindaiyu', treatment: 'aa' },
  ]);
  const assets = new Map(HL01_CARDS.map(card => [card.art.src, card.art]));
  for (const print of HL01_AA) assets.set(print.src, { columns: 1, rows: 1 });
  assert.equal(assets.size, 5);
  for (const [path, grid] of assets) {
    assert.match(path, /^assets\/hl01\/[a-z0-9-]+\.png$/);
    const bytes = readFileSync(new URL(path, root));
    assert(bytes.length >= 33, `${path} must contain a complete PNG header`);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} must be an actual PNG`);
    assert.equal(bytes.readUInt32BE(8), 13, `${path} must have a PNG IHDR`);
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', path);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    assert(width > 0 && height > 0, `${path} needs nonzero dimensions`);
    assert.equal(width % grid.columns, 0, `${path} cannot divide evenly into atlas columns`);
    assert.equal(height % grid.rows, 0, `${path} cannot divide evenly into atlas rows`);
  }
});

test('paper deck examples use eight distinct identities and fit the unchanged 25-star limit', () => {
  const all = new Map([...CARDS, ...HL01_CARDS].map(card => [card.id, card]));
  const totals = HL01_DECKS.map(deck => {
    assert(Object.isFrozen(deck) && Object.isFrozen(deck.ids));
    assert.equal(deck.ids.length, 8, deck.name);
    assert.equal(new Set(deck.ids).size, 8, deck.name);
    const total = deck.ids.reduce((sum, id) => {
      assert(all.has(id), `${deck.name}: unknown ${id}`);
      return sum + all.get(id).stars;
    }, 0);
    assert(total <= 25, `${deck.name} exceeds the deck budget`);
    return total;
  });
  assert.deepEqual(totals, [20, 21]);
  assert.deepEqual(HL01_DECKS[0].ids, ids);
});

test('preview content remains import-free and cannot access player state, services or randomness', () => {
  const source = readFileSync(new URL('honglou-cards.mjs', root), 'utf8');
  assert.doesNotMatch(source, /(?:^|\n)\s*import\s|\bimport\s*\(/);
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket)\b/);
  assert.doesNotMatch(source, /\b(?:Math\.random|crypto\.getRandomValues)\s*\(/);
  assert.doesNotMatch(source, /\b(?:document|window)\s*\./);
  const publicAssets = JSON.parse(readFileSync(new URL('hosting/public-assets.json', root), 'utf8'));
  assert.doesNotMatch(JSON.stringify(publicAssets), /honglou|assets\/hl01/, 'Preview completion must not publish the literary room');
});

test('the page module graph remains limited to the isolated Honglou UI and content files', () => {
  const read = path => readFileSync(new URL(path, root), 'utf8');
  const allowed = new Set(['honglou.mjs', 'honglou-cards.mjs']);
  const visited = new Set();
  const html = read('honglou.html');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+)['"]/g)].map(match => match[1].replace(/^\.\//, ''));
  assert.deepEqual(scripts, ['honglou.mjs']);
  function visit(path) {
    assert(allowed.has(path), `Unexpected Honglou preview dependency: ${path}`);
    if (visited.has(path)) return;
    visited.add(path);
    const source = read(path);
    const imports = [...source.matchAll(/(?:\bimport\s*(?:[^'";]*?\bfrom\s*)?|\bexport\s+[^'";]*?\bfrom\s*|\bimport\s*\()(['"])([^'"]+)\1/g)];
    for (const [, , specifier] of imports) {
      assert(specifier.startsWith('./'), `Preview requires an isolated local module: ${specifier}`);
      visit(specifier.slice(2));
    }
    assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket)\b/, `${path} must not access saves or services`);
    assert.doesNotMatch(source, /\b(?:Math\.random|crypto\.getRandomValues)\s*\(/, `${path} must not sample a random pack`);
  }
  visit('honglou.mjs');
  assert.deepEqual([...visited].sort(), [...allowed].sort());
});
