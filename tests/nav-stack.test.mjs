/** D1 Back model: the decision table and the state-only history core (nav-stack.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACK, NAV_STATE_KEY, NAV_STATE_VERSION, navLayers, navSignature, backDecision, isGuardDecision, readNavState, createNavHistory } from '../nav-stack.mjs';

const view = (extra = {}) => ({ screen: 'home', battle: null, accountReturn: 'home', bagGroup: false, preparationDeck: null, modal: null, modalReturn: null, ...extra });
const modal = (kind = null, dismissible = true) => ({ kind, dismissible });

/**
 * A tab's session history: one page before the game (unless `blank` is false: the game
 * is the tab's first entry, as in a new tab, a home-screen shortcut or a Custom Tab),
 * then the game's entries. Traversals are async, as in browsers.
 */
function sessionHistory(state = null, { blank = true } = {}) {
  const entries = [...(blank ? [{ doc: 'about:blank', state: null }] : []), { doc: 'game', state }];
  let index = entries.length - 1;
  // system: a Back with no entry before it (the system closes the tab or returns to the app
  // that opened it); ignored: a history.go out of range, which browsers ignore silently.
  const queued = [], log = { pushes: 0, replaces: 0, gos: [], left: 0, system: 0, ignored: 0 };
  const history = {
    scrollRestoration: 'auto',
    get state() { return structuredClone(entries[index].state); },
    get length() { return entries.length; },
    pushState(next) { entries.splice(index + 1); entries.push({ doc: 'game', state: structuredClone(next) }); index++; log.pushes++; },
    replaceState(next) { entries[index].state = structuredClone(next); log.replaces++; },
    go(delta) { log.gos.push(delta); queued.push(delta); },
  };
  return { history, entries, queued, log, get index() { return index; }, set index(value) { index = value; } };
}

/**
 * A model app: the view changes the way app.mjs's own functions change it, and
 * counts settlements, which Back must never cause.
 */
function harness({ state = null, blank = true, session = sessionHistory(state, { blank }), canPush = () => true, initial = view(), now = () => 0 } = {}) {
  const microtasks = [];
  const app = { view: structuredClone(initial), settlements: 0, decisions: [] };
  const apply = decision => {
    const v = app.view;
    app.decisions.push(decision.action);
    if (decision.action === BACK.DISMISS_MODAL) { v.modal = v.modalReturn; v.modalReturn = null; }
    if (decision.action === BACK.CLOSE_GROUP) v.bagGroup = false;
    if (decision.action === BACK.RETURN_PREPARATION) { v.screen = v.preparationDeck.screen; v.preparationDeck = null; v.modal = modal('preparation'); }
    if (decision.action === BACK.ACCOUNT_BACK) v.screen = v.accountReturn;
    if (decision.action === BACK.BATTLE_MENU) v.modal = modal('leave-battle');
    if (decision.action === BACK.HOME) { v.screen = 'home'; v.modal = null; v.preparationDeck = null; }
    if (decision.action === BACK.DISMISS_COACH) v.coach = null;
    nav.queue();
    return decision;
  };
  const nav = createNavHistory({
    history: session.history, sessionId: `s${Math.random()}`,
    depth: () => navLayers(app.view).length,
    back: () => apply(backDecision(app.view)),
    signature: () => navSignature(app.view),
    canPush, now, schedule: callback => microtasks.push(callback),
  });
  /** Run queued reconciliations, then deliver queued traversals one at a time. */
  function settle() {
    for (let guard = 0; guard < 100; guard++) {
      if (microtasks.length) { microtasks.shift()(); continue; }
      if (!session.queued.length) return;
      const delta = session.queued.shift(), target = session.index + delta;
      if (target < 0 || target >= session.entries.length) session.log.ignored++;
      else land(delta);
    }
    throw Error('history never settled');
  }
  function land(delta) {
    const target = session.index + delta;
    if (target < 0 || target >= session.entries.length) return;
    session.index = target;
    // Leaving the page: browsers fire pagehide (persisted when the page may enter the bfcache).
    if (session.entries[target].doc !== 'game') { session.log.left++; nav.pagehide(true); return; }
    nav.popstate(structuredClone(session.entries[target].state));
  }
  return {
    session, app, nav,
    layers: () => navLayers(app.view).length,
    /** A trusted click/tap: input first, then the handler changes the view and render queues a sync. */
    user(change) { nav.noteInput(); change(app.view); nav.queue(); settle(); },
    /** A change with no user input (storage event, async render). */
    passive(change) { change(app.view); nav.queue(); settle(); },
    /** The browser's or system's Back: a traversal the page did not start. With no entry before, the system takes it. */
    back() { if (session.index === 0) { session.log.system++; return; } land(-1); settle(); },
    forward() { land(1); settle(); },
    /** Only the queued reconciliations: our own traversal stays in flight. */
    microtasks() { while (microtasks.length) microtasks.shift()(); },
    land,
    settle,
  };
}
const started = options => { const h = harness(options); h.nav.start(); h.settle(); return h; };
/** A reload on the current entry: a new page (new session id, 洞府) on the same tab history. */
const reload = (h, options = {}) => started({ ...options, session: h.session });
const depthOnEntry = h => readNavState(h.session.history.state)?.abs - h.nav.state.base;
/** Open another page in the same tab (a typed URL or a bookmark): the entries ahead are dropped. */
function visit(h) { const { session } = h; session.entries.splice(session.index + 1); session.entries.push({ doc: 'other', state: null }); session.index++; }
const onOther = h => h.session.entries[h.session.index].doc === 'other';

test('N1 decision table: a dismissible dialog closes; result and other blocking dialogs hold', () => {
  for (const kind of [null, 'quests', 'experience-settings', 'preparation', 'codex-detail', 'pack-receipt', 'inheritance-select']) {
    assert.equal(backDecision(view({ screen: 'world', modal: modal(kind) })).action, BACK.DISMISS_MODAL, kind);
  }
  for (const kind of ['round-result', 'match-result', null]) {
    const decision = backDecision(view({ screen: 'battle', battle: 'finished', modal: modal(kind, false) }));
    assert.equal(decision.action, BACK.HOLD, `${kind} holds`);
    assert.ok(isGuardDecision(decision));
  }
  // A result card or settings opened over a result returns to that result.
  const chained = view({ screen: 'battle', battle: 'finished', modal: modal('result-card'), modalReturn: modal('match-result', false) });
  assert.equal(backDecision(chained).action, BACK.DISMISS_MODAL);
  assert.equal(navSignature(chained), 'battle:battle>modal:match-result>modal:result-card');
});

test('N2 decision table: sub-views return to their parent, destinations to 洞府, the root hands Back on', () => {
  assert.deepEqual(navLayers(view()), []);
  assert.equal(backDecision(view()).action, BACK.EXIT);
  for (const screen of ['world', 'arena', 'bag', 'collection', 'market']) {
    assert.equal(navSignature(view({ screen })), `destination:${screen}`);
    assert.equal(backDecision(view({ screen })).action, BACK.HOME, screen);
  }
  const group = view({ screen: 'bag', bagGroup: true });
  assert.equal(navSignature(group), 'destination:bag>sub-view:bag-group');
  assert.equal(backDecision(group).action, BACK.CLOSE_GROUP);
  // The group belongs to the bag only; other screens ignore the remembered group.
  assert.equal(navLayers(view({ screen: 'market', bagGroup: true })).length, 1);
  const deck = view({ screen: 'bag', preparationDeck: { screen: 'world' } });
  assert.equal(navSignature(deck), 'destination:world>sub-view:preparation>sub-view:preparation-deck');
  assert.equal(backDecision(deck).action, BACK.RETURN_PREPARATION);
  assert.equal(navLayers(view({ screen: 'bag', preparationDeck: { screen: 'world' }, bagGroup: true })).length, 4, 'a group opened while editing the deck is one more layer');
  const account = view({ screen: 'account', accountReturn: 'bag', bagGroup: true });
  assert.equal(navSignature(account), 'destination:bag>sub-view:bag-group>sub-view:account');
  assert.equal(backDecision(account).action, BACK.ACCOUNT_BACK);
  assert.equal(navSignature(view({ screen: 'account', accountReturn: 'home' })), 'sub-view:account');
  assert.equal(navSignature(view({ screen: 'account', accountReturn: 'battle' })), 'sub-view:account', 'never returns into a battle');
});

test('N3 decision table: a battle in progress opens the keep/abandon menu; a resolving or finished one does not', () => {
  assert.equal(backDecision(view({ screen: 'battle', battle: 'playing' })).action, BACK.BATTLE_MENU);
  assert.ok(isGuardDecision(backDecision(view({ screen: 'battle', battle: 'playing' }))));
  assert.equal(backDecision(view({ screen: 'battle', battle: 'settling' })).action, BACK.HOLD);
  assert.equal(backDecision(view({ screen: 'battle', battle: 'finished' })).action, BACK.HOME);
  assert.equal(backDecision(view({ screen: 'battle', battle: 'playing', modal: modal('leave-battle') })).action, BACK.DISMISS_MODAL);
});

test('N4 start keeps the URL, marks the base entry and owns scroll restoration', () => {
  const h = started();
  const state = readNavState(h.session.history.state);
  assert.equal(state.abs, 0); assert.equal(state.depth, 0); assert.equal(state.v, NAV_STATE_VERSION);
  assert.equal(h.session.history.scrollRestoration, 'manual');
  assert.equal(h.session.log.pushes, 0); assert.equal(h.session.history.length, 2);
  assert.equal(readNavState({ [NAV_STATE_KEY]: { v: 2, sid: 'x', abs: 0 } }), null);
  assert.equal(readNavState({ [NAV_STATE_KEY]: { v: 1, sid: 'x', abs: -1 } }), null);
  assert.equal(readNavState(null), null);
});

test('N5 each Back closes exactly one layer, and only the 洞府 root leaves', () => {
  const h = started();
  h.user(v => { v.screen = 'bag'; });
  h.user(v => { v.bagGroup = true; });
  h.user(v => { v.modal = modal(null); });
  assert.equal(h.session.log.pushes, 3); assert.equal(depthOnEntry(h), 3);
  const seen = [];
  while (h.layers()) { const before = h.layers(); h.back(); seen.push(navSignature(h.app.view)); assert.equal(h.layers(), before - 1); assert.equal(h.session.log.left, 0); }
  assert.deepEqual(seen, ['destination:bag>sub-view:bag-group', 'destination:bag', '']);
  assert.equal(h.nav.state.depth, 0);
  h.back();
  assert.equal(h.session.log.left, 1, 'Back at the root leaves the page');
  assert.equal(h.session.log.gos.length, 0, 'no history.go was needed');
});

test('N6 destination switches replace the entry; history stays bounded', () => {
  const h = started();
  const length = h.session.history.length;
  h.user(v => { v.screen = 'world'; });
  for (const screen of ['arena', 'bag', 'market', 'collection', 'world', 'arena']) h.user(v => { v.screen = screen; });
  assert.equal(h.session.log.pushes, 1);
  assert.equal(h.session.history.length, length + 1);
  assert.equal(readNavState(h.session.history.state).layers, 'destination:arena');
  h.back();
  assert.equal(h.app.view.screen, 'home');
  h.user(v => { v.screen = 'market'; });
  h.user(v => { v.screen = 'home'; });
  assert.equal(h.nav.state.depth, 0, 'choosing 洞府 in the dock walks back over the entry');
  assert.equal(h.session.history.length, length + 1);
});

test('N7 ×, Escape and backdrop closes consume their own entry; that popstate is not a second Back', () => {
  const h = started();
  h.user(v => { v.screen = 'bag'; v.bagGroup = true; });
  h.user(v => { v.modal = modal(null); });
  assert.equal(depthOnEntry(h), 3);
  h.user(v => { v.modal = null; }); // ×
  assert.deepEqual(h.session.log.gos, [-1]);
  assert.equal(depthOnEntry(h), 2);
  assert.equal(h.app.view.bagGroup, true, 'the walk back did not also close the group');
  assert.deepEqual(h.app.decisions, []);
  // Reopen and close repeatedly: the forward entry is replaced, never accumulated.
  const length = h.session.history.length;
  for (let index = 0; index < 10; index++) { h.user(v => { v.modal = modal(null); }); h.user(v => { v.modal = null; }); }
  assert.equal(h.session.history.length, length);
  assert.deepEqual(h.app.decisions, []);
});

test('N8 a result dialog holds on Back: no push from popstate, the guard entry is re-armed, nothing settles', () => {
  const h = started({ initial: view({ screen: 'battle', battle: 'playing' }) });
  h.user(() => {}); // resume pushed the battle entry
  assert.equal(depthOnEntry(h), 1);
  h.user(v => { v.battle = 'finished'; v.modal = modal('round-result', false); h.app.settlements++; });
  const pushes = h.session.log.pushes;
  for (let press = 0; press < 3; press++) {
    h.back();
    assert.equal(h.app.view.modal.kind, 'round-result');
    assert.equal(depthOnEntry(h), 2, 're-armed onto the entry the Back left');
    assert.equal(h.session.log.left, 0);
  }
  assert.equal(h.session.log.pushes, pushes, 'popstate never pushes');
  assert.deepEqual(h.app.decisions, ['hold', 'hold', 'hold']);
  assert.equal(h.app.settlements, 1);
  assert.deepEqual(h.session.log.gos, [1, 1, 1]);
});

test('N9 Back during a battle opens the keep/abandon menu; the next Back closes it; neither leaves', () => {
  const h = started();
  h.user(v => { v.screen = 'battle'; v.battle = 'playing'; });
  const pushes = h.session.log.pushes;
  h.back();
  assert.equal(h.app.view.modal.kind, 'leave-battle');
  assert.equal(depthOnEntry(h), 1, 'the battle entry is re-armed');
  h.back();
  assert.equal(h.app.view.modal, null);
  assert.equal(h.app.view.screen, 'battle');
  h.back();
  assert.equal(h.app.view.modal.kind, 'leave-battle');
  assert.equal(h.session.log.left, 0); assert.equal(h.session.log.pushes, pushes);
  // Keep and leave: one click to 洞府 walks back over the battle entry.
  h.user(v => { v.modal = null; v.screen = 'home'; v.battle = null; });
  assert.equal(h.nav.state.depth, 0);
  h.back();
  assert.equal(h.session.log.left, 1);
});

test('N10 pushes need a user turn: none after a traversal until the next input, and none when refused', () => {
  let allowed = false;
  const h = started({ canPush: () => allowed });
  h.user(v => { v.screen = 'world'; });
  assert.equal(h.session.log.pushes, 0, 'refused: no activation');
  allowed = true;
  h.user(() => {});
  assert.equal(h.session.log.pushes, 1, 'the next user turn pushes the missing entry');
  h.user(v => { v.modal = modal('preparation'); });
  h.back(); // closes preparation
  // A passive change after the traversal (no input since) must not push.
  h.passive(v => { v.modal = modal('pack-receipt'); });
  assert.equal(h.session.log.pushes, 2);
  assert.equal(depthOnEntry(h), 2, 'reused the entry still ahead instead');
  h.passive(v => { v.bagGroup = false; v.screen = 'bag'; v.bagGroup = true; });
  assert.equal(h.session.log.pushes, 2, 'a deficit waits for the next input');
  assert.equal(h.layers(), 3); assert.equal(depthOnEntry(h), 2);
  h.back();
  assert.equal(h.app.view.modal, null, 'one Back still closes one layer');
  assert.equal(h.session.log.left, 0);
});

test('N11 reload: the earlier load\'s entries are stale and left ahead of the root; Back at the root leaves in one step', () => {
  const first = started();
  first.user(v => { v.screen = 'bag'; v.bagGroup = true; });
  const old = readNavState(first.session.history.state);
  assert.equal(old.abs, 2);
  // The reloaded page starts at 洞府 and walks back to the tab's first game entry, its root.
  const h = reload(first);
  assert.deepEqual(h.session.log.gos, [-2], 'one walk back over the earlier load\'s entries');
  assert.equal(h.session.index, 1);
  assert.equal(h.nav.state.base, 0); assert.equal(h.nav.state.depth, 0);
  assert.equal(readNavState(h.session.history.state).sid, h.nav.state.sid);
  assert.notEqual(h.nav.state.sid, old.sid);
  assert.equal(h.session.history.length, 4, 'the earlier entries sit ahead until the next push');
  h.back();
  assert.deepEqual(h.app.decisions, [], 'a stale entry is never acted on as a layer');
  assert.equal(h.session.log.left, 1, 'the root hands Back on in one step');
  assert.deepEqual(h.session.log.gos, [-2], 'Back at the root is the browser\'s own: no jump');
});

test('N12 reload: if the walk back never lands, the reloaded entry stays the root; a stale entry below an open layer closes one layer and re-arms', () => {
  let clock = 0;
  const h = harness({ state: { [NAV_STATE_KEY]: { v: 1, sid: 'old', abs: 1, depth: 1, layers: '' } }, now: () => clock });
  h.session.entries.splice(1, 0, { doc: 'game', state: { [NAV_STATE_KEY]: { v: 1, sid: 'old', abs: 0, depth: 0, layers: '' } } });
  h.session.index = 2;
  h.nav.start(); h.microtasks();
  assert.deepEqual(h.session.queued, [-1]);
  h.session.queued.length = 0; // the browser dropped the walk and no popstate follows
  clock = 5000;
  h.passive(() => {});
  assert.equal(h.nav.state.pending, null); assert.equal(h.nav.state.rooting, false);
  assert.equal(h.nav.state.base, 1, 'the entry the page is really on is the root');
  // A deficit at the base (as when a push was refused): the next Back lands on the stale entry.
  h.app.view.screen = 'world';
  h.back();
  assert.equal(h.app.view.screen, 'home');
  assert.deepEqual(h.app.decisions, ['home']);
  assert.equal(h.session.log.left, 0);
  // Forward into a stale entry ahead of ours steps back.
  const k = harness({ state: { [NAV_STATE_KEY]: { v: 1, sid: 'old', abs: 0, depth: 0, layers: '' } } });
  k.session.entries.push({ doc: 'game', state: { [NAV_STATE_KEY]: { v: 1, sid: 'old', abs: 1, depth: 1, layers: '' } } });
  k.nav.start(); k.settle();
  k.forward();
  assert.equal(k.session.index, 1); assert.deepEqual(k.app.decisions, []);
});

test('N13 Forward into a closed layer walks back; bfcache restore re-reads and pushes nothing', () => {
  const h = started();
  h.user(v => { v.screen = 'world'; });
  h.user(v => { v.modal = modal('quests'); });
  h.back();
  assert.equal(h.app.view.modal, null);
  h.forward();
  assert.equal(depthOnEntry(h), 1, 'the closed dialog is not reopened; the extra entry is walked back');
  assert.equal(h.app.view.modal, null);
  const pushes = h.session.log.pushes;
  h.nav.pageshow(true); h.settle();
  assert.equal(h.nav.state.depth, 1); assert.equal(h.nav.state.inputTurn, false);
  h.passive(v => { v.modal = modal('quests'); });
  assert.equal(h.session.log.pushes, pushes, 'no push without input after a restore');
  h.nav.pageshow(false);
  assert.deepEqual(h.app.decisions, ['dismiss-modal']);
});

test('N14 a user Back racing our own walk: landing on our target is ours; a superseding Back counts from where the walk began', () => {
  const h = started();
  h.user(v => { v.screen = 'bag'; v.bagGroup = true; });
  h.user(v => { v.modal = modal(null); });
  // × queues our go(-1); the browser drops it for the user's Back from the same entry.
  h.nav.noteInput(); h.app.view.modal = null; h.nav.queue(); h.microtasks();
  assert.deepEqual(h.session.queued, [-1]);
  h.session.queued.length = 0;
  h.land(-1); h.settle();
  assert.deepEqual(h.app.decisions, [], 'one close is handled once');
  assert.equal(h.app.view.bagGroup, true);
  assert.equal(depthOnEntry(h), 2);
  // A re-arm go(+1) superseded by the next Back: that Back counts once, from where the walk began.
  const k = started({ initial: view({ screen: 'battle', battle: 'playing' }) });
  k.user(() => {});
  k.user(v => { v.battle = 'finished'; v.modal = modal('match-result', false); });
  k.land(-1); k.microtasks(); // holds; re-arm queued
  assert.deepEqual(k.session.queued, [1]);
  k.session.queued.length = 0;
  k.land(-1); k.settle();
  assert.deepEqual(k.app.decisions, ['hold', 'hold']);
  assert.equal(depthOnEntry(k), 2, 're-armed over both entries');
  assert.equal(k.session.log.left, 0);
});

test('N15 requestBack applies the same table with no browser Back, walks back over each closed layer\'s entry, and hands the root to the system', () => {
  const h = started();
  assert.equal(h.nav.requestBack(), BACK.EXIT);
  assert.deepEqual(h.session.log.gos, [], 'the root makes no traversal');
  h.user(v => { v.screen = 'bag'; v.bagGroup = true; v.modal = modal(null); });
  for (const [action, depth] of [[BACK.DISMISS_MODAL, 2], [BACK.CLOSE_GROUP, 1], [BACK.HOME, 0]]) {
    const gos = h.session.log.gos.length;
    assert.equal(h.nav.requestBack(), action);
    assert.deepEqual(h.session.log.gos.slice(gos), [-1], `${action}: history.go(-1) over the closed layer\'s entry`);
    h.settle();
    assert.equal(depthOnEntry(h), depth, 'its entry is consumed');
  }
  assert.deepEqual(h.app.decisions, [BACK.DISMISS_MODAL, BACK.CLOSE_GROUP, BACK.HOME], 'the popstate of each walk is the game\'s own, not a second Back');
  assert.equal(h.nav.requestBack(), BACK.EXIT);
  assert.equal(h.nav.state.depth, 0); assert.equal(h.session.log.left, 0);
});

test('N16 a seeded walk of 30 mixed steps keeps history.length ≤ initial + 4 and Back reaches the root', () => {
  let seed = 7;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let run = 0; run < 25; run++) {
    const h = started(), initial = h.session.history.length;
    for (let step = 0; step < 30; step++) {
      const v = h.app.view, roll = random();
      if (v.modal) {
        if (roll < 0.5) h.user(view => { view.modal = view.modalReturn; view.modalReturn = null; }); // ×, Escape or backdrop
        else { const before = h.layers(); h.back(); assert.equal(h.layers(), before - 1); }
      } else if (roll < 0.3) h.user(view => { view.screen = ['world', 'arena', 'bag', 'collection', 'market', 'home'][Math.floor(random() * 6)]; })
      else if (roll < 0.45 && v.screen === 'bag') h.user(view => { view.bagGroup = !view.bagGroup; })
      else if (roll < 0.75) h.user(view => { view.modal = modal(['quests', 'experience-settings', null][Math.floor(random() * 3)]); })
      else if (h.layers()) { const before = h.layers(); h.back(); assert.equal(h.layers(), before - 1); }
      assert.ok(h.session.history.length <= initial + 4, `run ${run} step ${step}: ${h.session.history.length}`);
      assert.equal(h.session.log.left, 0);
      assert.equal(depthOnEntry(h), h.layers(), 'entries mirror the layers');
    }
    while (h.layers()) { const before = h.layers(); h.back(); assert.equal(h.layers(), before - 1); assert.equal(h.session.log.left, 0); }
    h.back();
    assert.equal(h.session.log.left, 1);
  }
});

test('N17 a traversal of ours that never lands is given up after the stall window, so pushes resume', () => {
  let clock = 0;
  const h = started({ now: () => clock });
  h.user(v => { v.screen = 'bag'; v.bagGroup = true; });
  h.nav.noteInput(); h.app.view.bagGroup = false; h.nav.queue(); h.microtasks();
  assert.deepEqual(h.session.queued, [-1]);
  h.session.queued.length = 0; // the browser dropped it and no popstate follows
  clock = 1000;
  h.user(v => { v.modal = modal('quests'); });
  assert.equal(h.nav.state.pending, 1, 'still waiting inside the window');
  clock = 5000;
  h.user(() => {});
  assert.equal(h.nav.state.pending, null);
  // Recovered from the entry the page is really on (depth 2), then reconciled to 2 layers.
  assert.equal(depthOnEntry(h), 2);
  assert.equal(h.layers(), 2);
  h.back();
  assert.equal(h.app.view.modal, null);
  assert.equal(h.session.log.left, 0);
});

test('N18 the game as the tab\'s first entry: a reload walks back to it, and the first Back at the root goes to the system', () => {
  const first = started({ blank: false });
  assert.equal(first.session.history.length, 1);
  first.user(v => { v.screen = 'world'; });
  first.user(v => { v.modal = modal('experience-settings'); });
  assert.equal(first.session.index, 2);
  const h = reload(first);
  h.back();
  assert.equal(h.session.log.system, 1, 'one Back at 洞府 reaches the system (closes the tab or returns to the opening app)');
  assert.equal(h.session.log.ignored, 0, 'no out-of-range history.go');
  assert.deepEqual(h.session.log.gos, [-2], 'only the reload\'s walk back to the first entry; no jump past it');
  assert.equal(h.session.index, 0);
  assert.equal(h.nav.state.base, 0); assert.equal(h.nav.state.depth, 0);
  assert.equal(readNavState(h.session.history.state).sid, h.nav.state.sid, 'the first entry is this load\'s root');
  assert.deepEqual(h.app.decisions, []);
  // Forward into the earlier load's entries steps back; the next push drops them.
  h.forward();
  assert.equal(h.session.index, 0); assert.deepEqual(h.app.decisions, []);
  h.user(v => { v.screen = 'bag'; });
  assert.equal(h.session.history.length, 2, 'the earlier load\'s entries are gone');
  h.back();
  assert.equal(h.app.view.screen, 'home');
  h.back();
  assert.equal(h.session.log.system, 2);
  assert.equal(h.session.log.ignored, 0);
});

test('N19 reloads with layers open keep history.length bounded; after each, the root leaves in one Back', () => {
  let h = started();
  const initial = h.session.history.length;
  for (let cycle = 0; cycle < 6; cycle++) {
    h.user(v => { v.screen = 'world'; });
    h.user(v => { v.modal = modal('experience-settings'); });
    assert.equal(h.session.history.length, initial + 2, `cycle ${cycle}: two layers, two entries`);
    h = reload(h);
    assert.equal(h.session.history.length, initial + 2, `cycle ${cycle}: the reload adds no entry`);
  }
  assert.equal(h.nav.state.base, 0); assert.equal(h.nav.state.depth, 0);
  assert.equal(h.session.index, 1, 'the root is the tab\'s first game entry');
  h.back();
  assert.equal(h.session.log.left, 1);
  assert.equal(h.session.log.ignored, 0);
  assert.deepEqual(h.app.decisions, []);
});

test('N20 Back into the game from a page opened in the same tab, as a new load: one Forward still reaches that page past the earlier entries', () => {
  for (const blank of [true, false]) {
    const earlier = started({ blank });
    earlier.user(v => { v.screen = 'world'; });
    earlier.user(v => { v.modal = modal('experience-settings'); });
    visit(earlier);
    const length = earlier.session.history.length;
    // Back from that page misses the bfcache: the game's entry loads again and walks back to the root.
    earlier.session.index--;
    const h = reload(earlier);
    const root = blank ? 1 : 0;
    assert.equal(h.session.index, root); assert.equal(h.nav.state.depth, 0);
    h.forward();
    assert.ok(onOther(h), `blank ${blank}: Forward reached the page opened after the game`);
    assert.equal(h.session.log.left, 1);
    assert.deepEqual(h.session.log.gos, [-2, 1, 1], 'the walk to the root, then one step past each earlier entry');
    assert.deepEqual(h.app.decisions, [], 'no layer opened, nothing closed');
    assert.equal(h.session.history.length, length, 'no push');
    // Back from that page restores the game from the bfcache on the entry Forward left from;
    // it walks back to the root, so the next Back leaves (or goes to the system).
    h.session.index--;
    h.nav.pageshow(true); h.settle();
    assert.equal(h.session.index, root); assert.equal(h.nav.state.depth, 0);
    h.back();
    if (blank) assert.equal(h.session.log.left, 2); else assert.equal(h.session.log.system, 1);
    assert.equal(h.session.log.ignored, 0);
    assert.deepEqual(h.app.decisions, []);
  }
  // A user Back racing the step on (the browser drops ours) lands on 洞府 and stays there.
  const earlier = started();
  earlier.user(v => { v.screen = 'world'; });
  earlier.user(v => { v.modal = modal('experience-settings'); });
  visit(earlier); earlier.session.index--;
  const r = reload(earlier);
  r.land(1); r.microtasks();
  assert.deepEqual(r.session.queued, [1], 'stepping on from the first earlier entry');
  r.session.queued.length = 0;
  r.land(-1); r.settle();
  assert.equal(r.session.index, 1); assert.equal(r.nav.state.depth, 0);
  assert.equal(r.session.log.left, 0, 'not counted as a Back from a layer, so 洞府 does not leave');
  assert.deepEqual(r.app.decisions, []);
  // Without a reload: the page restored from the bfcache with its two layers; Back closes them,
  // then Forward steps past their entries to the page again, reopening nothing.
  const k = started();
  k.user(v => { v.screen = 'world'; });
  k.user(v => { v.modal = modal('experience-settings'); });
  visit(k); k.session.index--;
  k.nav.pageshow(true); k.settle();
  assert.equal(depthOnEntry(k), 2);
  k.back(); k.back();
  assert.equal(k.nav.state.depth, 0); assert.deepEqual(k.app.decisions, [BACK.DISMISS_MODAL, BACK.HOME]);
  k.forward();
  assert.ok(onOther(k), 'Forward reached the page past the closed layers\' entries');
  assert.equal(k.app.view.screen, 'home'); assert.equal(k.app.view.modal, null);
  assert.equal(k.session.log.pushes, 2);
});

test('N21 a bfcache restore on an entry an earlier load wrote walks back to the root, so the next Back leaves instead of stepping forward', () => {
  // The current load leaves from an earlier load's entry when Forward steps past entries that
  // load left ahead: after a reload at 洞府, or after a jump of two or three entries back from the
  // later page (the Back menu, a fast double Back) that loads the game anew below its top entry.
  for (const blank of [true, false]) for (const [how, jump] of [['reload at 洞府', 0], ['jump 2', 2], ['jump 3', 3]]) {
    const label = `${how}${blank ? '' : ', the game first in the tab'}`;
    const earlier = started({ blank });
    earlier.user(v => { v.screen = 'world'; });
    earlier.user(v => { v.modal = modal('experience-settings'); });
    const old = earlier.nav.state.sid;
    visit(earlier);
    if (jump) earlier.session.index -= jump;
    else {
      // Back from the page restores the game with both layers; two Backs close them.
      earlier.session.index--; earlier.nav.pageshow(true); earlier.settle();
      earlier.back(); earlier.back();
      assert.equal(earlier.nav.state.depth, 0); assert.equal(earlier.session.index, blank ? 1 : 0);
    }
    const h = reload(earlier), root = blank ? 1 : 0;
    assert.equal(h.session.index, root, `${label}: the new load is on the root`);
    h.forward();
    assert.ok(onOther(h), `${label}: Forward reached the later page`);
    const left = h.session.log.left;
    // Back from that page restores the game from the bfcache on the entry Forward left from.
    h.session.index--;
    const restored = readNavState(h.session.history.state);
    assert.equal(restored.sid, old, `${label}: the restored entry holds the earlier load's state`);
    assert.notEqual(restored.sid, h.nav.state.sid);
    assert.equal(restored.abs, 2);
    h.nav.pageshow(true); h.settle();
    assert.equal(h.session.index, root, `${label}: the restore walked back to the root`);
    assert.equal(h.nav.state.abs, 0); assert.equal(h.nav.state.depth, 0);
    h.back();
    assert.ok(!onOther(h), `${label}: Back did not step on to the later page`);
    if (blank) { assert.equal(h.session.index, 0); assert.equal(h.session.log.left, left + 1); }
    else assert.equal(h.session.log.system, 1, `${label}: Back at 洞府 goes to the system`);
    assert.equal(h.session.log.ignored, 0);
    assert.deepEqual(h.app.decisions, [], `${label}: no layer opened, nothing closed`);
  }
});

test('N22 a bfcache restore after 3 s or more on the later page walks back once: the render before pageshow starts no walk', () => {
  for (const own of [true, false]) {
    const label = own ? 'restored on the new load\'s entry' : 'restored on an earlier load\'s entry';
    let clock = 0;
    const earlier = started({ now: () => clock });
    earlier.user(v => { v.screen = 'world'; });
    earlier.user(v => { v.modal = modal('experience-settings'); });
    visit(earlier);
    // As N20 (the new load rewrites the top entry) or N21's jump 2 (it leaves that entry the earlier load's).
    earlier.session.index -= own ? 1 : 2;
    const h = reload(earlier, { now: () => clock });
    h.forward();
    assert.ok(onOther(h));
    clock = 5000; // the player stayed on the later page past the 3 s stall window
    h.session.index--;
    assert.equal(readNavState(h.session.history.state).sid === h.nav.state.sid, own, label);
    const gos = h.session.log.gos.length;
    // On a restore, visibilitychange fires before pageshow; its render queues a reconciliation.
    h.nav.queue(); h.microtasks();
    h.nav.pageshow(true); h.settle();
    assert.deepEqual(h.session.log.gos.slice(gos), [-2], `${label}: one walk back to the root`);
    assert.equal(h.session.index, 1); assert.equal(h.nav.state.depth, 0);
    assert.equal(h.session.log.ignored, 0, `${label}: no second walk past the root`);
    h.back();
    assert.equal(h.session.index, 0); assert.equal(h.session.log.ignored, 0);
    assert.deepEqual(h.app.decisions, []);
  }
  // A page that never comes back keeps nothing frozen: the next input or popstate reconciles.
  const k = started();
  k.nav.pagehide(true);
  k.user(v => { v.screen = 'world'; });
  assert.equal(depthOnEntry(k), 1, 'the push was made');
});

test('N23 D3 decision table: a first-battle coach mark is one dismissible layer, under table dialogs and over the round reveal', () => {
  const table = view({ screen: 'battle', battle: 'playing', coach: 'table' });
  assert.equal(navSignature(table), 'battle:battle>coach:coach');
  assert.equal(backDecision(table).action, BACK.DISMISS_COACH);
  assert.equal(isGuardDecision(backDecision(table)), false);
  // A card inspected over the coached table closes first; the coach mark is next.
  const inspected = view({ screen: 'battle', battle: 'playing', coach: 'table', modal: modal(null) });
  assert.equal(navSignature(inspected), 'battle:battle>coach:coach>modal:dialog');
  assert.equal(backDecision(inspected).action, BACK.DISMISS_MODAL);
  // In the round reveal the last mark sits over the result, which still holds after it.
  const reveal = view({ screen: 'battle', battle: 'playing', coach: 'dialog', modal: modal('round-result', false) });
  assert.equal(navSignature(reveal), 'battle:battle>modal:round-result>coach:coach');
  assert.equal(backDecision(reveal).action, BACK.DISMISS_COACH);
  assert.equal(backDecision({ ...reveal, coach: null }).action, BACK.HOLD);
  assert.equal(navLayers(view({ screen: 'battle', battle: 'playing', coach: 'dialog' })).length, 1, 'a dialog coach without its dialog is no layer');
  assert.equal(navLayers(view({ screen: 'battle', battle: 'playing', coach: 'elsewhere' })).length, 1);
});

test('N24 D3 Back closes the coach mark once, then the table and reveal behave as before; 跳過 walks back over its entry', () => {
  const h = started();
  h.user(v => { v.screen = 'battle'; v.battle = 'playing'; v.coach = 'table'; });
  assert.equal(depthOnEntry(h), 2, 'starting the first battle pushes the battle and its coach mark');
  h.back();
  assert.equal(h.app.view.coach, null); assert.equal(h.app.view.screen, 'battle');
  assert.deepEqual(h.app.decisions, [BACK.DISMISS_COACH]);
  h.back();
  assert.equal(h.app.view.modal.kind, 'leave-battle', 'the next Back is the battle menu, as without a coach');
  h.back();
  assert.equal(h.app.view.modal, null);
  // A coach mark over the round reveal: Back closes it, then the result holds.
  h.user(v => { v.modal = modal('round-result', false); v.coach = 'dialog'; });
  assert.equal(depthOnEntry(h), 3);
  h.back();
  assert.equal(h.app.view.coach, null); assert.equal(h.app.view.modal.kind, 'round-result');
  h.back();
  assert.equal(h.app.view.modal.kind, 'round-result');
  assert.deepEqual(h.app.decisions.slice(-2), [BACK.DISMISS_COACH, BACK.HOLD]);
  // 跳過 in the UI walks back over the coach entry instead of leaving it for a second Back.
  const skip = started();
  skip.user(v => { v.screen = 'battle'; v.battle = 'playing'; v.coach = 'table'; });
  skip.user(v => { v.coach = null; });
  assert.deepEqual(skip.session.log.gos, [-1]);
  assert.equal(depthOnEntry(skip), 1);
  assert.deepEqual(skip.app.decisions, []);
  assert.equal(h.session.log.left + skip.session.log.left, 0);
});
