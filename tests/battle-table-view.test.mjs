import assert from 'node:assert/strict';
import test from 'node:test';
import { createMatch, resolveRound, chooseAIMove, getBattleCard, hasFactionBonus, RULES } from '../engine.mjs';
import { TABLE_LABELS, permittedAnnouncement, createPlanningView, createRevealView } from '../battle-presentation.mjs';
import { battleTableMarkup, battleLineupMarkup, battleConfrontationMarkup, revealPairMarkup } from '../battle-ui.mjs';
import { cardPresentation } from '../card-presentation.mjs';

const move = (cardId, pills = 0, fury = false) => ({ cardId, pills, fury });
const art = id => cardPresentation(id);
function seeded(seed) {
  let value = seed >>> 0;
  return () => { value = (value + 0x6D2B79F5) >>> 0; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function fixture({ initiative = 'player', mode = 'arena', opponentLevels = {}, opponentName = null } = {}) {
  const match = createMatch({ mode, rng: () => 0.23, opponentLevels, opponentName });
  match.player = { hp: 12, pills: 12, hand: ['yaoheng', 'qingxiao', 'yanxin', 'cangjiao'], used: [] };
  match.opponent = { hp: 12, pills: 12, hand: ['yanxin', 'chiling', 'yaoheng', 'cuixian'], used: [] };
  match.initiative = initiative;
  return match;
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function noRandom(callback) {
  const original = Math.random;
  Math.random = () => { throw Error('The public table consumed game randomness'); };
  try { return callback(); } finally { Math.random = original; }
}
/** Only cardId may be read from a hidden move; any bid/Fury read throws. */
function sealedMove(cardId) {
  return new Proxy({ cardId }, { get(target, key) { if (key === 'pills' || key === 'fury' || key === 'cost') throw Error(`Hidden ${String(key)} was read`); return target[key]; } });
}
const tags = html => [...html.matchAll(/<button\b[^>]*>/g)].map(match => match[0]);
const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
const section = (html, className) => { const start = html.indexOf(`class="${className}`); return html.slice(start, html.indexOf('</div>', start)); };
const CARD_KEYS = ['id', 'slot', 'name', 'title', 'faction', 'factionName', 'factionIcon', 'factionColor', 'stars', 'power', 'damage', 'level', 'abilityLabel', 'bonus', 'state', 'label', 'usedRound'];

test('the announcement gate reads only a current, unused leading card ID', () => {
  const leading = fixture({ initiative: 'opponent' });
  assert.equal(permittedAnnouncement(leading, sealedMove('chiling')), 'chiling');
  assert.equal(permittedAnnouncement(leading, move('chiling', 0)), permittedAnnouncement(leading, move('chiling', 9, true)));
  assert.equal(permittedAnnouncement(leading, null), null);
  assert.equal(permittedAnnouncement(leading, move('chiling'), { revealPending: true }), null, 'never during a reveal');
  assert.equal(permittedAnnouncement(fixture({ initiative: 'player' }), move('chiling')), null, 'a responding AI announces nothing');
  assert.equal(permittedAnnouncement({ ...leading, status: 'finished' }, move('chiling')), null);
  assert.throws(() => permittedAnnouncement(leading, move('qingxiao')), /not public/);
  assert.throws(() => permittedAnnouncement({ ...leading, opponent: { ...leading.opponent, used: ['chiling'] } }, move('chiling')), /not public/);
});

test('planning view is a frozen public whitelist that never draws randomness', () => {
  const match = freeze(fixture({ initiative: 'opponent', opponentName: '<b>守渡</b>' }));
  const view = noRandom(() => createPlanningView(match, { announcedCardId: 'chiling' }));
  assert(Object.isFrozen(view) && Object.isFrozen(view.opponent.cards[0]) && Object.isFrozen(view.center.opponent));
  assert.deepEqual(Object.keys(view), ['phase', 'round', 'rounds', 'leader', 'prompt', 'opponent', 'player', 'center']);
  assert.deepEqual(Object.keys(view.opponent), ['name', 'hp', 'pills', 'cards']);
  assert.deepEqual(Object.keys(view.player), ['hp', 'pills', 'cards']);
  assert.deepEqual(Object.keys(view.center), ['opponent']);
  assert.deepEqual(Object.keys(view.center.opponent), ['state', 'label', 'card']);
  for (const card of [...view.opponent.cards, ...view.player.cards]) assert.deepEqual(Object.keys(card), CARD_KEYS);
  assert.equal(JSON.stringify(view).match(/"(?:fury|bid|cost|attack)"/), null, 'no hidden-move fields');
  assert.deepEqual(view.opponent.cards.map(card => card.id), match.opponent.hand);
  assert.deepEqual(view.opponent.cards.map(card => card.state), ['ready', 'announced', 'ready', 'ready']);
  assert.equal(view.center.opponent.card.id, 'chiling'); assert.equal(view.prompt, '你持後手 · 請應戰');
  const open = createPlanningView(fixture({ initiative: 'player' }));
  assert.deepEqual(open.center.opponent, { state: 'awaiting', label: TABLE_LABELS.awaiting, card: null });
  assert(open.opponent.cards.every(card => card.state === 'ready'));
});

test('planning rejects inconsistent announcements instead of guessing', () => {
  const leading = fixture({ initiative: 'opponent' });
  assert.throws(() => createPlanningView(leading), /commits before/);
  assert.throws(() => createPlanningView(fixture({ initiative: 'player' }), { announcedCardId: 'chiling' }), /Only the leading/);
  assert.throws(() => createPlanningView(leading, { announcedCardId: 'qingxiao' }), /Only the leading/);
  assert.throws(() => createPlanningView({ ...leading, status: 'finished' }, { announcedCardId: 'chiling' }), /in play/);
});

test('different secret bids and Fury give identical pre-reveal views and markup', () => {
  let compared = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const rng = seeded(seed);
    let match = createMatch({ rng, mode: seed % 3 ? 'arena' : 'expedition', opponentLevels: { chiling: 3, jinlin: 2 } });
    while (match.status === 'playing') {
      const playerCards = match.player.hand.filter(id => !match.player.used.includes(id));
      const playerMove = move(playerCards[Math.floor(rng() * playerCards.length)], Math.floor(rng() * (match.player.pills + 1)));
      let aiMove;
      if (match.initiative === 'opponent') {
        aiMove = chooseAIMove(match, rng);
        // Another legal secret commitment for the same public card, when one exists.
        const budget = match.opponent.pills;
        const alternate = [move(aiMove.cardId, 0), move(aiMove.cardId, budget), ...(budget >= 3 ? [move(aiMove.cardId, budget - 3, true), move(aiMove.cardId, 0, true)] : [])]
          .find(candidate => candidate.pills !== aiMove.pills || candidate.fury !== aiMove.fury);
        if (!alternate) { match = resolveRound(match, playerMove, aiMove); continue; }
        const views = [aiMove, alternate].map(hidden => noRandom(() => createPlanningView(match, { announcedCardId: permittedAnnouncement(match, hidden) })));
        assert.deepEqual(views[0], views[1]);
        const draft = { selected: playerMove.cardId, pills: playerMove.pills, fury: false };
        assert.equal(battleTableMarkup(views[0], { draft, art }), battleTableMarkup(views[1], { draft, art }));
        compared++;
      } else aiMove = chooseAIMove(match, rng, playerMove.cardId);
      match = resolveRound(match, playerMove, aiMove);
    }
  }
  assert(compared >= 40, `compared ${compared} opponent-led positions`);
});

test('after resolution the stale move is rejected and reveal labels come from lastResult', () => {
  const s0 = fixture({ initiative: 'player' }), player = move('qingxiao', 2), ai = chooseAIMove(s0, () => 0.23, 'qingxiao');
  const s1 = resolveRound(s0, player, ai);
  assert.equal(s1.status, 'playing'); assert.equal(s1.round, 2); assert.equal(s1.initiative, 'opponent');
  assert.equal(permittedAnnouncement(s1, ai, { revealPending: true }), null);
  assert.throws(() => permittedAnnouncement(s1, ai), /not public/, 'the old card is already used');
  assert.throws(() => createPlanningView(s1, { announcedCardId: ai.cardId }), /Only the leading/);
  assert.throws(() => createPlanningView(s1), /commits before/);
  const view = noRandom(() => createRevealView(freeze(structuredClone(s1))));
  assert.equal(view.phase, 'reveal'); assert.equal(view.round, 1); assert.equal(view.leader, 'player');
  assert.equal(view.prompt, '第 1 回合 · 已揭曉');
  assert.deepEqual(view.next, { round: 2, leader: 'opponent' });
  assert.equal(view.center.player.card.id, 'qingxiao'); assert.equal(view.center.opponent.card.id, ai.cardId);
  assert.deepEqual([view.center.opponent.pills, view.center.opponent.fury, view.center.opponent.attack], [ai.pills, ai.fury, s1.lastResult.opponent.attack], 'accepted bids are public at reveal');
  const played = view.opponent.cards.find(card => card.id === ai.cardId);
  assert.deepEqual([played.state, played.label, played.usedRound], ['played', '本輪出戰', 1]);
  assert(view.opponent.cards.filter(card => card.id !== ai.cardId).every(card => card.state === 'ready'));
  assert.throws(() => createRevealView(s0), /accepted round/);
  const ending = fixture({ initiative: 'opponent' }); ending.opponent.hp = 1;
  const finished = resolveRound(ending, move('qingxiao', 1, true), move('yanxin'));
  const final = createRevealView(finished);
  assert.equal(finished.status, 'finished'); assert.equal(final.next, null); assert.equal(final.finished, true); assert.equal(final.round, finished.lastResult.round);
});

test('a full match keeps dealt slots, used rounds and one current card at most', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const rng = seeded(seed * 97);
    let match = createMatch({ rng });
    const hands = { player: [...match.player.hand], opponent: [...match.opponent.hand] };
    while (match.status === 'playing') {
      const aiMove = match.initiative === 'opponent' ? chooseAIMove(match, rng) : null;
      const view = createPlanningView(match, { announcedCardId: permittedAnnouncement(match, aiMove) });
      for (const side of ['player', 'opponent']) {
        assert.deepEqual(view[side].cards.map(card => card.id), hands[side]);
        assert.deepEqual(view[side].cards.map(card => card.slot), [0, 1, 2, 3]);
        for (const card of view[side].cards) {
          assert.equal(card.label, TABLE_LABELS[card.state]);
          const index = match.history.findIndex(entry => entry[side].cardId === card.id);
          assert.equal(card.usedRound, card.state === 'used' ? index + 1 : null);
          assert.notEqual(card.state, 'played', 'planning never carries the last reveal');
        }
      }
      assert.equal(view.opponent.cards.filter(card => card.state === 'announced').length, aiMove ? 1 : 0);
      const cards = match.player.hand.filter(id => !match.player.used.includes(id));
      const playerMove = move(cards[0], Math.min(1, match.player.pills));
      match = resolveRound(match, playerMove, aiMove || chooseAIMove(match, rng, playerMove.cardId));
      const reveal = createRevealView(match);
      assert.equal(reveal.round, match.lastResult.round);
      assert.equal([...reveal.player.cards, ...reveal.opponent.cards].filter(card => card.state === 'played').length, 2);
    }
  }
});

test('cards show effective public stats, expedition ranks and the faction rule', () => {
  const expedition = fixture({ initiative: 'opponent', mode: 'expedition', opponentLevels: { chiling: 3 } });
  const view = createPlanningView(expedition, { announcedCardId: 'chiling' });
  const chiling = view.opponent.cards.find(card => card.id === 'chiling'), effective = getBattleCard(expedition, 'opponent', 'chiling');
  assert.deepEqual([chiling.power, chiling.damage, chiling.level], [effective.power, effective.damage, 3]);
  assert.equal(chiling.power, 8);
  const arena = createPlanningView(fixture({ initiative: 'opponent', opponentLevels: { chiling: 3 } }), { announcedCardId: 'chiling' });
  assert.equal(arena.opponent.cards[1].level, 1, 'collection ranks apply to expeditions only');
  for (const side of ['player', 'opponent']) for (const card of view[side].cards) assert.equal(card.bonus, hasFactionBonus(expedition, side, card.id));
  assert.equal(view.player.cards.find(card => card.id === 'yaoheng').bonus, true);
});

test('table markup keeps public hooks, explicit states and escaped names', () => {
  const match = fixture({ initiative: 'opponent', opponentName: '<img src=x>' });
  const s1 = resolveRound(match, move('qingxiao', 2), move('chiling', 4));
  const s2 = resolveRound(s1, move('yanxin', 1), chooseAIMove(s1, () => 0.23, 'yanxin'));
  const announced = chooseAIMove(s2, () => 0.23).cardId;
  const view = createPlanningView(s2, { announcedCardId: announced });
  const html = battleTableMarkup(view, { draft: { selected: 'yaoheng', pills: 2, fury: true }, art, actionsHtml: '<aside class="move-panel"></aside>' });
  assert(!html.includes('<img src=x>') && html.includes('&lt;img src=x&gt;'));
  const opponent = tags(section(html, 'enemy-hand'));
  assert.equal(opponent.length, 4);
  for (const tag of opponent) assert.deepEqual([attribute(tag, 'data-action'), attribute(tag, 'data-side')], ['inspect', 'opponent']);
  assert.deepEqual(opponent.map(tag => attribute(tag, 'data-card-id')), s2.opponent.hand);
  assert.deepEqual(opponent.filter(tag => attribute(tag, 'aria-current') === 'true').map(tag => attribute(tag, 'data-id')), [announced]);
  assert.match(opponent.find(tag => attribute(tag, 'data-id') === announced), /is-announced/);
  assert.equal(tags(html).filter(tag => attribute(tag, 'data-card-id') && attribute(tag, 'data-side') === 'opponent').length, 4, 'the centre carries no extra card hook');
  const ids = tags(html).map(tag => attribute(tag, 'id')).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'every battle button has a unique id');
  const own = tags(section(html, 'player-hand'));
  assert.deepEqual(own.map(tag => attribute(tag, 'data-action')), ['select', 'select', 'select', 'select']);
  for (const id of s2.player.used) {
    const tag = own.find(item => attribute(item, 'data-id') === id);
    assert.match(tag, /\sdisabled/); assert.match(attribute(tag, 'aria-label'), /已出戰（第 [12] 回合）/);
  }
  const selected = own.find(tag => attribute(tag, 'data-id') === 'yaoheng');
  assert.equal(attribute(selected, 'aria-pressed'), 'true'); assert.match(attribute(selected, 'aria-label'), /已選/);
  const ownSection = section(html, 'player-hand');
  assert.equal((ownSection.match(/battle-mini-state">已出戰</g) || []).length, 2);
  assert.equal((ownSection.match(/battle-mini-state">已選</g) || []).length, 1);
  const yaoheng = getBattleCard(s2, 'player', 'yaoheng');
  const stats = [...ownSection.slice(ownSection.indexOf('id="battle-card-player-yaoheng"')).matchAll(/class="card-stat">[^<]*<strong>(\d+)<\/strong>/g)].slice(0, 2).map(match => Number(match[1]));
  assert.deepEqual(stats, [yaoheng.power, yaoheng.damage]);
  const center = tags(html).find(tag => attribute(tag, 'id') === 'battle-center-opponent');
  assert.equal(attribute(center, 'data-id'), announced); assert.equal(attribute(center, 'data-card-id'), null);
  assert.match(html, /data-battle-announced/);
  assert.match(html, /<span class="round-steps">第 3 \/ 4 回合/);
  const waiting = battleConfrontationMarkup(createPlanningView(fixture({ initiative: 'player' })), { selected: 'qingxiao', art });
  assert.match(waiting, /data-state="awaiting"[^]*待對手應戰/); assert.doesNotMatch(waiting, /battle-center-opponent/);
  assert.match(waiting, /id="battle-center-player"[^>]*data-id="qingxiao"/);
  assert.match(battleLineupMarkup(view, 'opponent', { art }), /aria-label="對手手牌 · 本局四張"/);
  assert.match(html, /對手手牌 · 本局四張/);
});

test('reveal markup and the dialog pair are labelled by the resolved round', () => {
  const s1 = resolveRound(fixture({ initiative: 'opponent' }), move('qingxiao', 2, true), move('chiling', 4));
  const view = createRevealView(s1);
  const pair = revealPairMarkup(view);
  assert.match(pair, /<span class="reveal-pair-round">第 1 回合<\/span>/);
  assert.match(pair, /青霄/); assert.match(pair, /赤翎/); assert.match(pair, /暗置 2 丹 ＋ 怒擊/); assert.match(pair, /暗置 4 丹 ·/);
  // The winner word has its own hook (staged until impact) and only on the winner's side.
  const winner = view.center.winner, loser = winner === 'player' ? 'opponent' : 'player';
  assert.equal((pair.match(/class="reveal-pair-outcome"/g) || []).length, 1);
  assert.match(pair, new RegExp(`data-side="${winner}" data-winner><span class="reveal-pair-owner">[^<]*<span class="reveal-pair-outcome"> · 勝</span>`));
  assert.doesNotMatch(pair, new RegExp(`data-side="${loser}" data-winner`));
  const html = battleTableMarkup(view, { art });
  assert.match(html, /data-battle-phase="reveal"/); assert.match(html, /第 1 \/ 4 回合/);
  assert.equal(tags(section(html, 'player-hand')).every(tag => attribute(tag, 'data-action') === 'inspect'), true, 'no draft selection during a reveal');
  const played = tags(section(html, 'enemy-hand')).find(tag => attribute(tag, 'data-id') === 'chiling');
  assert.match(attribute(played, 'class'), /\bis-played\b/); assert.match(attribute(played, 'aria-label'), /本輪出戰（第 1 回合）/);
  assert.equal(RULES.rounds, view.rounds);
});
