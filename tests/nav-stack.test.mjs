/** D1 Back model: the decision table and the state-only history core (nav-stack.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACK, NAV_STATE_KEY, NAV_STATE_VERSION, navLayers, navSignature, backDecision, isGuardDecision, readNavState, createNavHistory } from '../nav-stack.mjs';

const view = (extra = {}) => ({ screen: 'home', battle: null, accountReturn: 'home', bagGroup: false, preparationDeck: null, modal: null, modalReturn: null, ...extra });
const modal = (kind = null, dismissible = true) => ({ kind, dismissible });

/** A tab's session history: one page before the game, then the game's entries. Traversals are async, as in browsers. */
function sessionHistory(state = null) {
  const entries = [{ doc: 'about:blank', state: null }, { doc: 'game', state }];
  let index = 1;
  const queued = [], log = { pushes: 0, replaces: 0, gos: [], left: 0, reloads: 0 };
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
function harness({ state = null, canPush = () => true, initial = view() } = {}) {
  const session = sessionHistory(state), microtasks = [];
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
    nav.queue();
    return decision;
  };
  const nav = createNavHistory({
    history: session.history, sessionId: `s${Math.random()}`,
    depth: () => navLayers(app.view).length,
    back: () => apply(backDecision(app.view)),
    signature: () => navSignature(app.view),
    canPush, schedule: callback => microtasks.push(callback),
  });
  /** Run queued reconciliations, then deliver queued traversals one at a time. */
  function settle() {
    for (let guard = 0; guard < 100; guard++) {
      if (microtasks.length) { microtasks.shift()(); continue; }
      if (!session.queued.length) return;
      land(session.queued.shift());
    }
    throw Error('history never settled');
  }
  function land(delta) {
    const target = session.index + delta;
    if (target < 0 || target >= session.entries.length) return;
    session.index = target;
    if (session.entries[target].doc !== 'game') { session.log.left++; return; }
    nav.popstate(structuredClone(session.entries[target].state));
  }
  return {
    session, app, nav,
    layers: () => navLayers(app.view).length,
    /** A trusted click/tap: input first, then the handler changes the view and render queues a sync. */
    user(change) { nav.noteInput(); change(app.view); nav.queue(); settle(); },
    /** A change with no user input (storage event, async render). */
    passive(change) { change(app.view); nav.queue(); settle(); },
    /** The browser's or system's Back: a traversal the page did not start. */
    back() { land(-1); settle(); },
    forward() { land(1); settle(); },
    /** Only the queued reconciliations: our own traversal stays in flight. */
    microtasks() { while (microtasks.length) microtasks.shift()(); },
    land,
    settle,
  };
}
const started = options => { const h = harness(options); h.nav.start(); h.settle(); return h; };
const depthOnEntry = h => readNavState(h.session.history.state)?.abs - h.nav.state.base;

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

test('N11 reload: entries of the earlier load are stale; at the root Back leaves in one step', () => {
  const first = started();
  first.user(v => { v.screen = 'bag'; v.bagGroup = true; });
  const old = first.session.history.state;
  assert.equal(readNavState(old).abs, 2);
  // The reloaded page starts at 洞府 on the same entry and keeps its absolute position.
  const h = harness({ state: old });
  h.session.entries.splice(1, 0, { doc: 'game', state: { [NAV_STATE_KEY]: { ...readNavState(old), abs: 0 } } }, { doc: 'game', state: { [NAV_STATE_KEY]: { ...readNavState(old), abs: 1 } } });
  h.session.index = 3;
  h.nav.start(); h.settle();
  assert.equal(h.nav.state.base, 2); assert.equal(h.nav.state.depth, 0);
  assert.notEqual(readNavState(h.session.history.state).sid, readNavState(old).sid);
  h.back();
  assert.deepEqual(h.app.decisions, [], 'a stale entry is never acted on as a layer');
  assert.equal(h.session.log.left, 1, 'the root hands Back on past the stale entries');
  assert.deepEqual(h.session.log.gos, [-2]);
});

test('N12 reload: a stale entry below an open layer closes one layer and re-arms', () => {
  const h = harness({ state: { [NAV_STATE_KEY]: { v: 1, sid: 'old', abs: 1, depth: 1, layers: '' } } });
  h.session.entries.splice(1, 0, { doc: 'game', state: { [NAV_STATE_KEY]: { v: 1, sid: 'old', abs: 0, depth: 0, layers: '' } } });
  h.session.index = 2;
  h.nav.start(); h.settle();
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

test('N15 requestBack applies the same table without a traversal and hands the root to the system', () => {
  const h = started();
  assert.equal(h.nav.requestBack(), BACK.EXIT);
  h.user(v => { v.screen = 'bag'; v.bagGroup = true; v.modal = modal(null); });
  assert.equal(h.nav.requestBack(), BACK.DISMISS_MODAL); h.settle();
  assert.equal(depthOnEntry(h), 2, 'its entry is consumed');
  assert.equal(h.nav.requestBack(), BACK.CLOSE_GROUP); h.settle();
  assert.equal(h.nav.requestBack(), BACK.HOME); h.settle();
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
