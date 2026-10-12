/**
 * Back model (docs/NAVIGATION.md, "Back model"). Which layer one Back closes, and the
 * state-only history entries that let a browser or system Back reach the game
 * instead of leaving it. The URL never changes: no hash routing, no deep links.
 *
 * Pure: `navLayers` and `backDecision` read a plain view object, and
 * `createNavHistory` is handed its `history`, scheduler and push permission, so
 * Node tests drive every row without a DOM. app.mjs builds the view, applies a
 * decision with its existing functions and forwards popstate/pageshow/input here.
 */

export const NAV_STATE_KEY = 'mythseal.nav';
export const NAV_STATE_VERSION = 1;
export const ROOT_SCREEN = 'home';

/** The decision table's actions. app.mjs maps each to the function its in-app control already calls. */
export const BACK = Object.freeze({
  DISMISS_MODAL: 'dismiss-modal',
  HOLD: 'hold',
  CLOSE_GROUP: 'close-group',
  RETURN_PREPARATION: 'return-preparation',
  ACCOUNT_BACK: 'account-back',
  BATTLE_MENU: 'battle-menu',
  HOME: 'home',
  EXIT: 'exit',
});
const SUB_VIEW_BACK = Object.freeze({ 'bag-group': BACK.CLOSE_GROUP, 'preparation-deck': BACK.RETURN_PREPARATION, account: BACK.ACCOUNT_BACK });
// A guard row leaves a decision on screen; further steps of a multi-entry Back stop there.
const GUARDS = new Set([BACK.HOLD, BACK.BATTLE_MENU]);

const modalLayer = ({ kind = null, dismissible = true } = {}) => ({ kind: 'modal', id: kind || 'dialog', dismissible: dismissible !== false });

function screenLayers(view, screen, nested = false) {
  if (!screen || screen === ROOT_SCREEN) return [];
  if (screen === 'battle') return [{ kind: 'battle', id: 'battle' }];
  if (screen === 'account') {
    const parent = ['account', 'battle'].includes(view.accountReturn) ? ROOT_SCREEN : view.accountReturn;
    return [...screenLayers(view, parent, true), { kind: 'sub-view', id: 'account' }];
  }
  const group = screen === 'bag' && view.bagGroup ? [{ kind: 'sub-view', id: 'bag-group' }] : [];
  // Editing the deck from preparation: the origin screen, the closed preparation, then the editor.
  if (!nested && view.preparationDeck && ['bag', 'collection'].includes(screen)) {
    const origin = ['bag', 'collection', 'account', 'battle'].includes(view.preparationDeck.screen) ? ROOT_SCREEN : view.preparationDeck.screen;
    return [...screenLayers(view, origin, true), { kind: 'sub-view', id: 'preparation' }, { kind: 'sub-view', id: 'preparation-deck' }, ...group];
  }
  return [{ kind: 'destination', id: screen }, ...group];
}

/**
 * Layers above the 洞府 root, bottom first.
 * view: { screen, battle: 'playing'|'settling'|'finished'|null, accountReturn, bagGroup,
 *         preparationDeck: {screen}|null, modal: {kind, dismissible}|null, modalReturn: {kind, dismissible}|null }
 * modalReturn is the dialog the open one returns to (a result card or settings opened over a result or preparation).
 */
export function navLayers(view = {}) {
  const layers = screenLayers(view, view.screen || ROOT_SCREEN);
  if (view.modal) {
    if (view.modalReturn) layers.push(modalLayer(view.modalReturn));
    layers.push(modalLayer(view.modal));
  }
  return layers;
}

export const navSignature = view => navLayers(view).map(layer => `${layer.kind}:${layer.id}`).join('>');

/** One Back on this view: the decision table (docs/NAVIGATION.md, "Back model"). */
export function backDecision(view = {}) {
  const layers = navLayers(view), top = layers.at(-1);
  if (!top) return { action: BACK.EXIT, layer: null };
  if (top.kind === 'modal') return { action: top.dismissible ? BACK.DISMISS_MODAL : BACK.HOLD, layer: top };
  if (top.kind === 'battle') {
    if (view.battle === 'playing') return { action: BACK.BATTLE_MENU, layer: top };
    // A commit is resolving or saving: the result is about to open; nothing navigates under it.
    if (view.battle === 'settling') return { action: BACK.HOLD, layer: top };
    return { action: BACK.HOME, layer: top };
  }
  if (top.kind === 'sub-view') return { action: SUB_VIEW_BACK[top.id] || BACK.HOME, layer: top };
  return { action: BACK.HOME, layer: top };
}

export const isGuardDecision = decision => GUARDS.has(decision?.action);

/** A history.state entry this module wrote, from any page load; null otherwise. */
export function readNavState(state) {
  let value;
  try { value = state?.[NAV_STATE_KEY]; } catch { return null; }
  if (!value || value.v !== NAV_STATE_VERSION || typeof value.sid !== 'string' || !Number.isSafeInteger(value.abs) || value.abs < 0) return null;
  return value;
}

const randomId = () => {
  try { return globalThis.crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
};

/**
 * Mirrors the layer count with state-only entries above this load's base entry.
 * - `depth()`: layers above the root now; `back()`: apply one decision, return it.
 * - Entries are pushed only on a user turn (an input since the last traversal, and
 *   `canPush()`); after a Back, a layer that needs its entry again reuses the entry
 *   that Back just left with history.go(+n), never a new push without activation.
 * - Closing in the UI walks back over its entries, and the popstate that walk causes
 *   is recognised as ours, so one close is never handled twice.
 * - Entries from an earlier load (reload, bfcache) are stale: they hold no layer, are
 *   never acted on as one, and settle nothing. A reload walks back to the tab's first
 *   game entry and makes it the root, so the earlier entries sit ahead (the next push
 *   drops them) and Back at the root is the browser's own, even when nothing precedes
 *   the game in the tab.
 * - Forward onto an entry above the layers held (a closed layer's, or an earlier
 *   load's) opens nothing. When the tab has an entry past it, the page steps on with
 *   history.go(+1), so Forward still reaches a page opened after the game in this tab;
 *   otherwise it steps back to the layers held.
 * - A bfcache restore reads its position from the restored entry, whichever load
 *   wrote it, and walks back to the layers held if it is above them. While the page
 *   is hidden (pagehide), reconciliation waits, so a render that runs on the restore
 *   before pageshow (visibilitychange) starts no second walk.
 * Each entry's state: { v, sid, abs, depth, layers, first }. `abs` counts this tab's
 * game entries from the first one, across reloads, so a reload knows how far to walk
 * back. `first` is that first entry's index in the tab's history, read from
 * history.length on the load that created it; it can only overstate the index (the
 * browser may drop the oldest entries), so "an entry exists past this one" is never
 * claimed wrongly.
 */
export const NAV_STALL_MS = 3000;
export function createNavHistory({ history, depth, back, signature = () => '', canPush = () => true, schedule = callback => queueMicrotask(callback), now = () => Date.now(), sessionId = randomId() }) {
  // abs: the entry we are on; base: this load's root entry; top: our highest entry still in
  // the list; pending: where our own traversal lands, from `origin`, started at `pendingAt`.
  // rooting: the reload's walk back to the first game entry is in flight. passing: our own
  // step on past an entry that holds no layer is in flight. first: see above. hidden: the
  // page left with persisted pagehide (it may come back from the bfcache) and has not been
  // shown again.
  let started = false, abs = 0, base = 0, top = 0, pending = null, origin = 0, pendingAt = 0, written = null, queued = false, inputTurn = false, rooting = false, passing = false, first = 0, hidden = false;
  const sid = sessionId;
  const entry = at => ({ [NAV_STATE_KEY]: { v: NAV_STATE_VERSION, sid, abs: at, depth: at - base, layers: signature(), first } });
  /** The tab has an entry past the game entry at `at` (a later game entry or another page). */
  const past = at => { try { return first + at < history.length - 1; } catch { return false; } };
  const write = (method, at) => {
    // Browsers throttle and may throw on bursts of history writes; a refused push is a deficit, not an error.
    try { history[method](entry(at), ''); written = signature(); return true; } catch { return false; }
  };
  function go(delta) {
    if (!delta) return;
    origin = abs; pending = abs + delta; pendingAt = now();
    history.go(delta);
  }
  /** A same-document walk lands within milliseconds. One that never fired popstate (the
   * browser dropped it) must not block every later push: read where the page really is. */
  function recoverStall() {
    if (pending === null || now() - pendingAt < NAV_STALL_MS) return;
    const current = readNavState(history.state);
    // A reload's walk that never landed leaves the reloaded entry as the root (entries below it stay stale).
    pending = null; rooting = false; passing = false;
    if (current && current.sid === sid) abs = current.abs;
  }
  function sync() {
    queued = false;
    // Hidden, or being restored before pageshow: pageshow reconciles once it knows where the page is.
    if (hidden) return;
    recoverStall();
    if (!started || pending !== null) return;
    const want = base + depth();
    if (want < abs) return go(want - abs);
    if (want > abs) {
      if (inputTurn && canPush()) {
        while (abs < want && write('pushState', abs + 1)) abs++;
        top = abs;
        if (abs === want) return;
      }
      // Not a user turn (or a push was refused): reuse our own entries still ahead.
      if (top > abs) go(Math.min(want, top) - abs);
      return;
    }
    if (written !== signature()) write('replaceState', abs);
  }
  /** Coalesce the reconciliation to after the current handler's state changes. */
  function queue() {
    if (queued || !started) return;
    queued = true;
    schedule(sync);
  }
  /** The reload's walk landed. The tab's first game entry becomes this load's root; if a
   * superseding traversal stopped it short, walk on. */
  function rooted(current) {
    pending = null;
    if (current && current.abs > 0) return go(-current.abs);
    rooting = false;
    abs = base = top = 0;
    write('replaceState', 0);
    sync();
  }
  /** Leave past the 洞府 root, from a game entry above it (a Back that skipped more entries
   * than there are layers) or from a stale entry below it (a reload's walk never landed).
   * A Back at the root itself normally needs neither: once a reload has walked back, no game
   * entry is below the root, so the browser's own Back leaves. The jump assumes a page
   * before the game's first entry; when there is none, the browser ignores it. */
  function exit(from) {
    pending = null;
    history.go(-(Math.max(from, 0) + 1));
  }
  function backSteps(steps) {
    for (let step = 0; step < steps; step++) {
      if (!depth()) return exit(abs);
      if (isGuardDecision(back())) break;
    }
    sync();
  }
  /** Forward (the user's, or our own step on) landed on the entry at `at`. When that entry
   * is above the layers held, it opens nothing; when the tab has an entry past it, step on,
   * so a page opened after the game stays reachable. Returns whether it stepped on. */
  function passOn(at) {
    const onward = pending === null ? at > abs : at === pending ? passing : at > origin;
    passing = false;
    if (!onward || at <= base + depth() || !past(at)) return false;
    abs = at; passing = true;
    go(1);
    return true;
  }
  function stale(state) {
    pending = null;
    // An entry from an earlier load of this tab, ahead of ours, that Forward did not step
    // past: step back onto the entry that holds our top layer.
    if (state && state.abs > top) { const target = Math.min(base + depth(), top); abs = state.abs; return go(target - abs); }
    // Below this load's root (only when a reload's walk never landed): it holds no layer.
    // At the root, keep leaving; otherwise this Back closes one layer and our entries ahead
    // are reused.
    abs = state ? Math.min(state.abs, base - 1) : base - 1;
    if (!depth()) return exit(abs);
    backSteps(1);
  }
  return {
    get state() { return { started, sid, abs, base, top, pending, inputTurn, rooting, passing, first, hidden, depth: abs - base }; },
    start() {
      const current = readNavState(history.state);
      abs = base = top = current ? current.abs : 0;
      // This entry's index is at most history.length - 1 (exactly that on a new load,
      // which opens on the tab's last entry), so the first game entry's is at most that
      // minus abs. A stored `first`, from the load that created the first entry, is
      // usually exact. Both can only overstate it.
      let bound = 0;
      try { bound = history.length - 1 - abs; } catch {}
      first = Math.max(0, Number.isSafeInteger(current?.first) && current.first >= 0 ? Math.min(current.first, bound) : bound);
      try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch {}
      started = true;
      write('replaceState', abs);
      // A reload (or a restored tab) on an entry above the first: the earlier load's entries
      // are below. Walk back over them; if the walk never lands, this entry stays the root.
      if (abs > 0) { rooting = true; go(-abs); }
    },
    /** A trusted, activation-giving input: the next reconciliation may push. */
    noteInput() { inputTurn = true; hidden = false; },
    queue,
    sync,
    popstate(state) {
      if (!started) return;
      inputTurn = false; hidden = false;
      const current = readNavState(state);
      if (rooting) return rooted(current);
      if (current && passOn(current.abs)) return;
      if (!current || current.sid !== sid) return stale(current);
      // Our own walk landing is not a Back. Landing elsewhere means the user's traversal
      // superseded ours, counted from where we stood when ours began, or from the layers
      // held if that entry was above them (a step on, or a walk back from a closed layer).
      let from = abs;
      if (pending !== null) { from = current.abs === pending ? pending : Math.min(origin, base + depth()); pending = null; }
      abs = current.abs;
      const steps = from - abs;
      if (steps > 0) return backSteps(steps);
      // Our own walk landed, or Forward reached an entry whose layer is closed and nothing
      // is past it: reconcile.
      sync();
    },
    /** The page is leaving. With `persisted` it may come back from the bfcache: until
     * pageshow, no reconciliation runs (a restore fires visibilitychange, and so a render,
     * before pageshow). */
    pagehide(persisted) {
      if (started && persisted) hidden = true;
    },
    /** bfcache restore: re-read where we are; settle nothing and push nothing. A page that
     * left from an entry above its layers (Forward stepped past it) walks back to them. */
    pageshow(persisted) {
      hidden = false;
      if (!started || !persisted) return;
      inputTurn = false; pending = null; rooting = false; passing = false;
      const current = readNavState(history.state);
      // `abs` counts the tab's game entries from the first one across reloads, so an entry
      // an earlier load wrote (one Forward stepped past to leave) still gives the position.
      abs = current ? current.abs : base;
      // The entries above the restored one may be gone, so top falls to it. When Forward
      // stepped past this entry to leave, it holds no layer: top stays below it, and the
      // reconciliation walks back to the layers held.
      top = Math.min(abs, top);
      queue();
    },
    /**
     * One Back that no browser Back started (a future native back button). It applies one
     * row; when that row closes a layer, the reconciliation then walks the history back
     * over the layer's entry with history.go(-n), as a UI close does, and that popstate is
     * recognised as ours. Returns the row's action; 'exit' at the root hands Back to the system.
     */
    requestBack() {
      if (!started) return BACK.EXIT;
      if (!depth()) return BACK.EXIT;
      inputTurn = false;
      const decision = back();
      sync();
      return decision?.action ?? BACK.HOLD;
    },
  };
}
