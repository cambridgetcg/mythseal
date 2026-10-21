// T1 first-visit teaching (docs/TUTORIAL-T1.md): the rules-first route, read on real profiles.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMatch, RULES } from '../engine.mjs';
import { createProfile, beginBattle, finishBattle, abandonBattle, startActivity, abandonActivity, buyPack, ACTIVITY_PILL_FLOOR } from '../progression.mjs';
import { getActiveDeck, saveInstanceDeck, setInstanceXP, MAX_DECK_SLOTS } from '../collection.mjs';
import { coachStart } from '../battle-teaching.mjs';
import { lobbyMarkup } from '../navigation-ui.mjs';
import { dailyMarkup } from '../adventure-ui.mjs';
import {
  FIRST_EXPEDITION, GUIDE_KEY, GUIDE_HINTS, GUIDE_DIALOG_KINDS, NEWCOMER_BATTLES, ANY_BATTLE_TASK_FIELD, isFirstVisit, isNewcomer, rulesStartRoute,
  questGoRoute, guideScreenKey, activeDeckTopLevel, guideHints, hintMarkup, createGuideMemory,
} from '../first-visit.mjs';

const now = new Date('2026-10-20T12:00:00.000Z');
const fresh = () => createProfile({ now });
const begun = (profile = fresh(), options = { kind: 'expedition', nodeId: FIRST_EXPEDITION }) => beginBattle(profile, { ...options, rng: () => 0.23, now });
function finished(winner = 'player', options) {
  const { profile, encounter } = begun(fresh(), options);
  const played = Object.keys(encounter.cardInstances).slice(0, 1);
  return finishBattle(profile, { encounterId: encounter.id, winner, playedCardIds: played, now }).profile;
}
const cardMarkup = () => '<i></i>';

test('a first visit is no battle finished and none in progress, as the lobby reads it', () => {
  assert.equal(isFirstVisit(fresh()), true);
  assert.equal(isFirstVisit(begun().profile), false, 'a battle in progress');
  assert.equal(isFirstVisit(abandonBattle(begun().profile)), true, 'an abandoned first battle finished nothing');
  assert.equal(isFirstVisit(finished('opponent')), false, 'a lost battle still counts as played');
  assert.equal(isFirstVisit(finished('player', { kind: 'practice' })), false, 'practice counts too');
  for (const value of [null, undefined, {}, { stats: {} }]) assert.equal(isFirstVisit(value), false);
  // The lobby uses the same predicate: its title and rules link change together.
  assert.match(lobbyMarkup(fresh(), cardMarkup), /初次落子？讀懂弈道/);
  assert.match(lobbyMarkup(fresh(), cardMarkup), /初入山海，請落第一子。/);
  assert.match(lobbyMarkup(finished(), cardMarkup), /溫習弈道/);
  assert.doesNotMatch(lobbyMarkup(begun().profile, cardMarkup), /初次落子/);
});

test('知其道，入其局 leads a first visit to 霧隱渡口 and everyone else to practice', () => {
  const ferry = { kind: 'expedition', nodeId: 'mist-gate' }, practice = { kind: 'practice', nodeId: null };
  assert.deepEqual({ ...rulesStartRoute(fresh()) }, ferry, 'fresh');
  assert.deepEqual({ ...rulesStartRoute(finished()) }, practice, 'after a finished battle');
  assert.deepEqual({ ...rulesStartRoute(finished('draw', { kind: 'arena' })) }, practice, 'after an arena draw');
  assert.deepEqual({ ...rulesStartRoute(begun().profile) }, practice, 'with a pending battle (prepareEncounter then shows it)');
  assert.deepEqual({ ...rulesStartRoute(abandonBattle(begun().profile)) }, ferry, 'after an abandoned first battle');
  assert.ok(Object.isFrozen(rulesStartRoute(fresh())));
});

test('the route and D3 agree: the first-visit route starts the coach at its first mark', () => {
  const route = rulesStartRoute(fresh());
  const match = createMatch({ mode: route.kind, rng: () => 0.23 });
  assert.equal(coachStart({ encounter: route, played: 0, match })?.step, 'card', 'D3 coaches the battle the rules lead to');
  // And the practice route is the one D3 leaves alone.
  assert.equal(coachStart({ encounter: rulesStartRoute(finished()), played: 0, match: createMatch({ rng: () => 0.23 }) }), null);
});

// ── T1.1: 任務手札's 前往 (docs/TUTORIAL-T1.md, T1.1) ─────────────────────────────────
/** The 前往 buttons as 任務手札 renders them: each task's destination and counter. */
const questButtons = (profile, tab) => dailyMarkup(profile, null, tab).split('class="task-row"').slice(1).flatMap(row => {
  const title = row.match(/<h3>([^<]+)<\/h3>/)?.[1], button = row.match(/data-action="quest-go" data-id="([a-z]+)" data-field="([A-Za-z]+)"/);
  return button ? [{ title, destination: button[1], field: button[2] }] : [];
});
const routes = (profile, tab) => Object.fromEntries(questButtons(profile, tab).map(({ title, ...button }) => [title, { ...questGoRoute(profile, button) }]));

test('任務手札: on a first visit 今日落子 and 七日弈緣 lead to 霧隱渡口; every other 前往 keeps its place', () => {
  const ferry = { kind: 'expedition', nodeId: 'mist-gate' }, go = destination => ({ kind: 'navigate', destination });
  assert.deepEqual(routes(fresh(), 'daily'), { 今日落子: ferry, 山海行旅: go('world'), 星匣初啟: go('market') }, 'fresh, daily');
  assert.deepEqual(routes(fresh(), 'weekly'), { 七日弈緣: ferry, 踏遍山海: go('world'), 問道五弈: go('arena') }, 'fresh, weekly: an arena-only task keeps 對弈');
  assert.deepEqual(routes(abandonBattle(begun().profile), 'daily').今日落子, ferry, 'an abandoned first battle: still a first visit');
  for (const [label, profile] of [['won', finished()], ['lost', finished('opponent')], ['practice', finished('player', { kind: 'practice' })], ['pending', begun().profile]]) {
    assert.deepEqual(routes(profile, 'daily').今日落子, go('arena'), `${label}: 對弈, as before`);
    assert.deepEqual(routes(profile, 'weekly').七日弈緣, go('arena'), `${label}: 對弈, as before`);
  }
  assert.deepEqual({ ...questGoRoute(fresh()) }, go(null), 'no task: nothing to reroute');
  assert.ok(Object.isFrozen(questGoRoute(fresh(), { destination: 'arena', field: ANY_BATTLE_TASK_FIELD })));
});

test('任務手札: the rerouted tasks are the ones the ferry battle counts toward, and D3 coaches it', () => {
  for (const kind of ['expedition', 'practice', 'arena']) {
    const options = kind === 'expedition' ? { kind, nodeId: FIRST_EXPEDITION } : { kind };
    const after = finished('opponent', options);
    assert.equal(after.daily[ANY_BATTLE_TASK_FIELD], 1, `${kind}: every finished battle adds to the daily counter`);
    assert.equal(after.weekly[ANY_BATTLE_TASK_FIELD], 1, `${kind}: and to the weekly one`);
  }
  assert.equal(finished('player', { kind: 'expedition', nodeId: FIRST_EXPEDITION }).weekly.arenaMatches, 0, 'the ferry does not count toward 問道五弈');
  const route = questGoRoute(fresh(), { destination: 'arena', field: ANY_BATTLE_TASK_FIELD });
  assert.equal(coachStart({ encounter: route, played: 0, match: createMatch({ mode: route.kind, rng: () => 0.23 }) })?.step, 'card');
});

// ── T1 hints (docs/TUTORIAL-T1.md §2) ─────────────────────────────────────────────
const SCREENS = ['home', 'world', 'arena', 'bag-cards', 'bag-decks', 'market', 'collection', 'account', 'battle'];
const holds = (profile, { selectedNode = profile.location, coachSeen = null } = {}) => [
  ...SCREENS.flatMap(key => guideHints({ profile, key, selectedNode, coachSeen }, 'screen')),
  ...GUIDE_DIALOG_KINDS.flatMap(key => guideHints({ profile, key, selectedNode, coachSeen }, 'dialog')),
].map(hint => hint.id).sort();
const won = () => finished('player');
const tried = profile => { const run = startActivity(profile, { rng: () => 0.23, now }).profile; return abandonActivity(run, { expectedRunId: run.expansion.fireMountain.run.id, now }); };
const withPlayed = (profile, played) => ({ ...profile, stats: { ...profile.stats, played } });
const codePoints = text => [...text].length;
function deepFreeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }

test('the registry: nine hints, each with a slot, a voice, a lifetime and short copy', () => {
  assert.ok(GUIDE_HINTS.length >= 6 && GUIDE_HINTS.length <= 10, `${GUIDE_HINTS.length} hints`);
  assert.equal(GUIDE_HINTS.length, 9, 'T1\'s eight and T1.1\'s home-next');
  assert.equal(new Set(GUIDE_HINTS.map(hint => hint.id)).size, GUIDE_HINTS.length, 'unique ids');
  for (const hint of GUIDE_HINTS) {
    assert.ok(['screen', 'dialog'].includes(hint.channel), hint.id);
    assert.equal(typeof hint.scene, 'function', hint.id);
    assert.equal(typeof hint.slot.replace, 'string', hint.id);
    assert.ok(Array.isArray(hint.slot.remove), hint.id);
    assert.ok(['guardian', 'narrator'].includes(hint.voice), hint.id);
    assert.ok(['visit', 'condition'].includes(hint.lasts), hint.id);
    for (const coachSeen of [null, 'done', 'skipped']) {
      const copy = hint.copy({ coachSeen });
      assert.ok(codePoints(copy) <= 40, `${hint.id}: ${codePoints(copy)} code points: ${copy}`);
      assert.doesNotMatch(copy, /[「」]/, `${hint.id}: the quote marks are the markup's`);
      if (hint.voice === 'guardian') assert.ok(hintMarkup(hint, { coachSeen }).includes(`守渡弈者</span>「${copy}」`), `${hint.id}: the guardian is quoted`);
    }
  }
  assert.deepEqual(GUIDE_HINTS.filter(hint => hint.voice === 'guardian').map(hint => hint.id), ['home-start', 'arena-first']);
  const dialogs = GUIDE_HINTS.filter(hint => hint.channel === 'dialog');
  for (const hint of dialogs) assert.equal(GUIDE_DIALOG_KINDS.filter(kind => hint.scene(kind)).length, 1, `${hint.id} belongs to one dialog kind`);
  assert.deepEqual([...GUIDE_DIALOG_KINDS].sort(), [...new Set(dialogs.flatMap(hint => GUIDE_DIALOG_KINDS.filter(kind => hint.scene(kind))))].sort());
  assert.ok(Object.isFrozen(GUIDE_HINTS) && GUIDE_HINTS.every(hint => Object.isFrozen(hint) && Object.isFrozen(hint.slot)));
  // bag-decks reads its numbers from the rules, never a copy of them.
  assert.equal(GUIDE_HINTS.find(hint => hint.id === 'bag-decks').copy({}), `每套 ${RULES.deckSize} 位不同角色、總星數不超過 ${RULES.starLimit}；可存 ${MAX_DECK_SLOTS} 套，設為出戰的才上陣。`);
});

test('conditions on a fresh journey and after the first ferry win', () => {
  const start = fresh();
  assert.deepEqual(holds(start), ['arena-first', 'bag-copies', 'bag-decks', 'home-start', 'market-printing', 'quests-why'], 'fresh, on 霧隱渡口 (建議 Lv.1, deck Lv.1)');
  assert.equal(activeDeckTopLevel(start), 1);
  assert.deepEqual(holds(start, { selectedNode: 'ember-pass' }).includes('world-level'), false, 'a locked node keeps its own lines');
  const after = won();
  assert.deepEqual(holds(after), ['bag-copies', 'bag-decks', 'fire-mountain', 'home-next', 'market-printing', 'quests-why']);
  assert.ok(holds(after, { selectedNode: 'jade-forest' }).includes('world-level'), '青玉森庭 asks Lv.2 of a Lv.1 deck');
  const uid = getActiveDeck(after).instanceIds[0], trained = setInstanceXP(after, uid, 80);
  assert.equal(activeDeckTopLevel(trained), 2);
  assert.equal(holds(trained, { selectedNode: 'jade-forest' }).includes('world-level'), false, 'a Lv.2 card in the deck meets it');
  assert.equal(holds(trained, { selectedNode: 'ember-pass' }).includes('world-level'), false, '赤燼關 is still locked');
});

test('conditions follow pending and abandoned battles, fire-mountain runs, deck slots and packs', () => {
  assert.ok(holds(abandonBattle(begun().profile)).includes('home-start'), 'an abandoned first battle: still a first visit');
  assert.equal(holds(begun().profile).includes('home-start'), false, 'a pending battle: no first visit');
  const after = won();
  const running = startActivity(after, { rng: () => 0.23, now }).profile;
  assert.equal(holds(running).includes('fire-mountain'), false, 'a run in progress');
  const abandoned = tried(after);
  assert.equal(abandoned.expansion.serial, 1);
  assert.equal(abandoned.expansion.fireMountain.lastResult, null, 'abandoned before any result');
  assert.equal(abandoned.expansion.fireMountain.clears, 0);
  assert.equal(holds(abandoned).includes('fire-mountain'), false, 'a run once started counts as tried');
  const second = saveInstanceDeck(after, { slotId: 'deck-2', name: '二陣', instanceIds: getActiveDeck(after).instanceIds });
  assert.equal(second.deckSlots.length, 2);
  assert.equal(holds(second).includes('bag-decks'), false, 'a second deck slot');
  const opened = buyPack(after, { set: 'wx01', rng: () => 0.23, now }).profile;
  assert.equal(opened.wx01.opened, 1);
  assert.equal(holds(opened).includes('market-printing'), false, 'one WX-01 pack opened');
});

test('home-next: after the first result, on 洞府, for the first and second finished battles only', () => {
  const next = profile => holds(profile).includes('home-next');
  const homeNext = GUIDE_HINTS.find(item => item.id === 'home-next'), homeStart = GUIDE_HINTS.find(item => item.id === 'home-start');
  assert.equal(next(fresh()), false, 'no result yet: home-start speaks instead');
  assert.equal(next(abandonBattle(begun().profile)), false, 'an abandoned first battle is no result');
  for (const [label, profile] of [['a ferry win', finished()], ['a ferry loss', finished('opponent')], ['a first practice', finished('player', { kind: 'practice' })], ['a first arena draw', finished('draw', { kind: 'arena' })]]) {
    assert.equal(profile.stats.played, 1, label);
    assert.equal(next(profile), true, `${label}: it shows`);
  }
  assert.equal(next(withPlayed(finished(), 2)), true, 'the second result');
  assert.equal(next(withPlayed(finished(), 3)), false, 'the third retires it');
  assert.equal(next(begun(finished(), { kind: 'practice' }).profile), false, 'a battle in progress: 繼續對局 is the next step');
  assert.deepEqual(guideHints({ profile: finished(), key: 'world', selectedNode: 'mist-gate' }, 'screen').map(item => item.id).includes('home-next'), false, '洞府 only');
  // Newcomers only, never beside home-start: it shares home-start's line.
  assert.deepEqual({ ...homeNext.slot, remove: [...homeNext.slot.remove] }, { ...homeStart.slot, remove: [...homeStart.slot.remove] });
  for (let played = 0; played <= NEWCOMER_BATTLES + 2; played++) for (const profile of [withPlayed(fresh(), played), withPlayed(begun().profile, played)]) {
    const ids = holds(profile);
    assert.ok(!(ids.includes('home-start') && ids.includes('home-next')), `played ${played}: one line, one hint`);
    if (ids.includes('home-next')) assert.ok(isNewcomer(profile), `played ${played}: newcomers only`);
  }
  // The narrator, a condition hint, and the copy the owner reviews (13–25 code points; one line at 302 px).
  assert.equal(homeNext.voice, 'narrator');
  assert.equal(homeNext.lasts, 'condition');
  assert.equal(homeNext.copy({}), '功課在任務手札，修練在同行記。');
  assert.ok(codePoints(homeNext.copy({})) >= 13 && codePoints(homeNext.copy({})) <= 25);
});

test('fire-mountain: the copy states the recovery a won battle applies, from the same floor', () => {
  const copy = GUIDE_HINTS.find(hint => hint.id === 'fire-mountain').copy({});
  assert.equal(copy, `三戰相連：生命與仙丹帶到下一戰，勝後生命 +2、仙丹至少補至 ${ACTIVITY_PILL_FLOOR}，再選一項補給。`);
  assert.doesNotMatch(copy, /敗或和/, 'the overview\'s own line already says a loss or draw ends the run');
  const run = startActivity(won(), { rng: () => 0.23, now }).profile;
  const after = finishBattle(run, { encounterId: run.pending.id, winner: 'player', playedCardIds: run.pending.playerDeck.slice(0, 1), finalResources: { hp: 9, pills: 1 }, now }).profile.expansion.fireMountain.run;
  assert.deepEqual({ hp: after.hp, pills: after.pills, phase: after.phase }, { hp: 9 + 2, pills: ACTIVITY_PILL_FLOOR, phase: 'supply' });
});

test('veterans: ten finished battles see no hint, except a mountain never climbed', () => {
  assert.equal(NEWCOMER_BATTLES, 10);
  const after = won();
  const veteran = withPlayed(tried(after), NEWCOMER_BATTLES);
  assert.equal(isNewcomer(veteran), false);
  for (const node of ['mist-gate', 'jade-forest']) assert.deepEqual(holds(veteran, { selectedNode: node }), [], `no hint anywhere (${node})`);
  assert.deepEqual(holds(withPlayed(after, NEWCOMER_BATTLES)), ['fire-mountain'], 'only the mountain, never started');
  assert.deepEqual(holds(withPlayed(after, NEWCOMER_BATTLES - 1)), ['bag-copies', 'bag-decks', 'fire-mountain', 'market-printing', 'quests-why'], 'nine battles: still a newcomer');
});

test('copy follows the coach: 我陪你 is promised only before the coach ends', () => {
  const ctx = coachSeen => ({ profile: fresh(), key: 'home', selectedNode: 'mist-gate', coachSeen });
  const home = GUIDE_HINTS.find(hint => hint.id === 'home-start'), arena = GUIDE_HINTS.find(hint => hint.id === 'arena-first');
  assert.match(home.copy(ctx(null)), /我陪你/);
  assert.match(arena.copy(ctx(null)), /我陪你/);
  for (const seen of ['done', 'skipped']) {
    assert.doesNotMatch(home.copy(ctx(seen)), /陪/);
    assert.doesNotMatch(arena.copy(ctx(seen)), /陪/);
  }
});

test('the screen key is the visit: the bag splits by tab, never by layout or opened character', () => {
  assert.equal(guideScreenKey('bag', 'cards'), 'bag-cards');
  assert.equal(guideScreenKey('bag', 'decks'), 'bag-decks');
  assert.equal(guideScreenKey('bag', undefined), 'bag-cards');
  for (const screen of ['home', 'world', 'arena', 'market', 'collection', 'account', 'battle']) assert.equal(guideScreenKey(screen, 'decks'), screen);
});

test('conditions and copy only read: a deep-frozen profile is neither changed nor a reason to throw', () => {
  for (const make of [fresh, won, () => tried(won()), () => begun().profile]) {
    const profile = deepFreeze(make()), before = JSON.stringify(profile);
    for (const selectedNode of ['mist-gate', 'jade-forest', 'ember-pass', 'unknown-node']) {
      for (const key of [...SCREENS, ...GUIDE_DIALOG_KINDS]) for (const hint of GUIDE_HINTS) {
        const ctx = { profile, key, selectedNode, coachSeen: null };
        assert.doesNotThrow(() => { hint.scene(key); hint.when(ctx); hint.copy(ctx); hintMarkup(hint, ctx); }, `${hint.id} on ${key}`);
      }
    }
    assert.equal(JSON.stringify(profile), before);
  }
  // A malformed profile places nothing rather than throwing into render().
  assert.deepEqual(guideHints({ profile: { stats: { played: 0 } }, key: 'activity' }, 'dialog'), []);
});

// ── shanhai.guide.v1 (§5.2) ─────────────────────────────────────────────────────
function memoryStorage(initial = null, { throwOnGet = false, throwOnSet = false } = {}) {
  const values = new Map(initial === null ? [] : [[GUIDE_KEY, initial]]), writes = [];
  return {
    values, writes,
    getItem(key) { if (throwOnGet) throw new Error('blocked'); return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { if (throwOnSet) throw new Error('full'); writes.push(key); values.set(key, String(value)); },
  };
}
const hint = id => GUIDE_HINTS.find(item => item.id === id);
const visitHints = ['bag-copies', 'bag-decks', 'market-printing'].map(hint);

test('memory: empty, corrupt, array and null records read as empty', () => {
  for (const raw of [null, '', 'not json', '[]', 'null', '42', '"text"', '{"seen":"bag-copies"}']) {
    const memory = createGuideMemory(memoryStorage(raw));
    assert.equal(memory.enabled(), true, raw);
    const token = memory.enter('screen', 'bag-cards');
    assert.deepEqual(memory.select(visitHints, token).map(item => item.id), ['bag-copies', 'bag-decks', 'market-printing'], raw);
  }
  assert.equal(createGuideMemory(memoryStorage('{"off":true}')).enabled(), false);
  assert.equal(createGuideMemory(null).enabled(), true, 'no storage at all');
});

test('memory: a visit hint shows for the whole visit it is recorded on, then never again', () => {
  const storage = memoryStorage(), memory = createGuideMemory(storage);
  const first = memory.enter('screen', 'bag-cards');
  assert.deepEqual(memory.select([hint('bag-copies')], first).map(item => item.id), ['bag-copies']);
  memory.shown(['bag-copies'], first);
  assert.deepEqual(JSON.parse(storage.values.get(GUIDE_KEY)), { seen: ['bag-copies'] });
  assert.equal(memory.enter('screen', 'bag-cards'), first, 'the same key is the same visit');
  assert.deepEqual(memory.select([hint('bag-copies')], first).map(item => item.id), ['bag-copies'], 'pinned for the rest of the visit');
  const next = memory.enter('screen', 'home'), back = memory.enter('screen', 'bag-cards');
  assert.notEqual(next, first); assert.notEqual(back, first);
  assert.deepEqual(memory.select([hint('bag-copies')], back), [], 'a new visit does not show it');
  // A stale token (its channel has moved on) records nothing.
  memory.shown(['bag-decks'], first);
  assert.deepEqual(JSON.parse(storage.values.get(GUIDE_KEY)).seen, ['bag-copies']);
  // The dialog channel is its own; leave() ends its visit.
  const dialog = memory.enter('dialog', 'quests');
  memory.shown(['quests-why'], dialog);
  assert.deepEqual(memory.select([hint('quests-why')], dialog).map(item => item.id), ['quests-why']);
  memory.leave('dialog');
  assert.deepEqual(memory.select([hint('quests-why')], memory.enter('dialog', 'quests')), []);
  // A new page (a reload) keeps the record.
  const reloaded = createGuideMemory(storage);
  assert.deepEqual(reloaded.select([hint('bag-copies'), hint('quests-why'), hint('bag-decks')], reloaded.enter('screen', 'bag-cards')).map(item => item.id), ['bag-decks']);
  assert.throws(() => memory.enter('battle', 'x'), RangeError);
});

test('memory: condition hints always show and are never written; writes only on change, only to its key', () => {
  const storage = memoryStorage(), memory = createGuideMemory(storage);
  const token = memory.enter('screen', 'home');
  memory.shown(['home-start', 'arena-first', 'world-level'], token);
  assert.deepEqual(storage.writes, [], 'condition hints are never recorded');
  memory.shown(['bag-copies'], memory.enter('screen', 'bag-cards'));
  memory.shown(['bag-copies'], memory.enter('screen', 'bag-cards'));
  assert.deepEqual(storage.writes, [GUIDE_KEY], 'one write, only when something changed');
  const later = memory.enter('screen', 'home');
  assert.deepEqual(memory.select([hint('home-start')], later).map(item => item.id), ['home-start']);
});

test('memory: unknown ids are kept, malformed ones dropped', () => {
  const storage = memoryStorage(JSON.stringify({ seen: ['future-hint', 'BAD ID', 5, 'bag-copies', 'future-hint', 'x'.repeat(41)], extra: 1 }));
  const memory = createGuideMemory(storage);
  memory.shown(['market-printing'], memory.enter('screen', 'market'));
  assert.deepEqual(JSON.parse(storage.values.get(GUIDE_KEY)), { seen: ['bag-copies', 'future-hint', 'market-printing'] });
});

test('memory: the switch turns hints off, and back on from each channel\'s next visit', () => {
  const storage = memoryStorage(), memory = createGuideMemory(storage);
  const bag = memory.enter('screen', 'bag-cards'), quests = memory.enter('dialog', 'quests');
  memory.shown(['bag-copies'], bag); memory.shown(['quests-why'], quests);
  memory.setEnabled(false);
  assert.equal(memory.enabled(), false);
  assert.deepEqual(JSON.parse(storage.values.get(GUIDE_KEY)), { seen: ['bag-copies', 'quests-why'], off: true });
  assert.deepEqual(memory.select([hint('bag-copies'), hint('home-start')], bag), [], 'off shows nothing, condition hints included');
  memory.setEnabled(true);
  assert.equal(memory.enabled(), true);
  assert.deepEqual(JSON.parse(storage.values.get(GUIDE_KEY)), { seen: [] }, 'on clears seen and off');
  assert.deepEqual(memory.select([hint('bag-copies'), hint('home-start')], memory.enter('screen', 'bag-cards')), [], 'the visit in progress stays quiet');
  assert.deepEqual(memory.select([hint('quests-why')], memory.enter('dialog', 'quests')), []);
  memory.shown(['bag-copies'], bag);
  assert.deepEqual(JSON.parse(storage.values.get(GUIDE_KEY)), { seen: [] }, 'a quiet visit records nothing');
  memory.enter('screen', 'home');
  const again = memory.enter('screen', 'bag-cards');
  assert.deepEqual(memory.select([hint('bag-copies')], again).map(item => item.id), ['bag-copies'], 'the next visit shows it again');
  assert.deepEqual(memory.select([hint('quests-why')], (memory.leave('dialog'), memory.enter('dialog', 'quests'))).map(item => item.id), ['quests-why']);
});

test('memory: a storage that throws costs only the record, never the page', () => {
  for (const options of [{ throwOnGet: true, throwOnSet: true }, { throwOnGet: true }, { throwOnSet: true }]) {
    const storage = memoryStorage(null, options), memory = createGuideMemory(storage);
    const token = memory.enter('screen', 'bag-cards');
    assert.doesNotThrow(() => memory.shown(['bag-copies'], token));
    assert.deepEqual(memory.select([hint('bag-copies')], memory.enter('screen', 'home') && memory.enter('screen', 'bag-cards')), [], `${JSON.stringify(options)}: the page remembers`);
    assert.doesNotThrow(() => memory.setEnabled(false));
    assert.equal(memory.enabled(), false, JSON.stringify(options));
    assert.doesNotThrow(() => memory.setEnabled(true));
    assert.equal(memory.enabled(), true);
    memory.enter('screen', 'home');
    assert.deepEqual(memory.select([hint('bag-copies')], memory.enter('screen', 'bag-cards')).map(item => item.id), ['bag-copies'], `${JSON.stringify(options)}: on replays it`);
  }
});

test('markup: one body span with the prefix, the seal or label and escaped text; no control', () => {
  for (const item of GUIDE_HINTS) {
    const markup = hintMarkup(item, { coachSeen: null });
    assert.match(markup, /^<span class="guide-hint-body"><span class="sr-only">初見提點：<\/span>/);
    assert.ok(markup.endsWith('</span>'));
    assert.doesNotMatch(markup, /<(?:button|a|b|i|small|input)\b|tabindex|aria-live|role=/, item.id);
    assert.match(markup, item.voice === 'guardian' ? /<span class="guide-hint-voice">守渡弈者<\/span>「/ : /<span class="guide-hint-seal" aria-hidden="true">初見<\/span>/);
  }
  const hostile = { ...hint('world-level'), copy: () => '<img src=x onerror=alert(1)>&"' };
  assert.doesNotMatch(hintMarkup(hostile, {}), /<img/);
  assert.match(hintMarkup(hostile, {}), /&lt;img src=x onerror=alert\(1\)&gt;&amp;&quot;/);
});

test('the placement adapter tolerates null nodes and stubs (render and modal under test controllers)', async () => {
  const { placeGuideHints, visibleGuideHints } = await import('../scene-adapters.mjs');
  const entries = GUIDE_HINTS.map(item => ({ hint: item, html: hintMarkup(item, {}) }));
  assert.deepEqual(placeGuideHints(null, entries), []);
  assert.deepEqual(placeGuideHints({ querySelector: () => null }, entries), [], 'no slot, nothing placed');
  assert.deepEqual(placeGuideHints({ querySelector: () => null }, null), []);
  assert.deepEqual(visibleGuideHints([{ id: 'bag-copies', node: { isConnected: true, closest: () => null } }]), [], 'no getClientRects: not visible');
  assert.deepEqual(visibleGuideHints([{ id: 'bag-copies', node: null }]), []);
  assert.deepEqual(visibleGuideHints(null), []);
});
