import test from 'node:test';
import assert from 'node:assert/strict';
import { createPackOpeningController } from '../pack-opening.mjs';

class Events {
  listeners = new Map();
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type) { for (const callback of this.listeners.get(type) || []) callback(); }
  count() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}
function environment({ reduce = false, fast = false } = {}) {
  const document = Object.assign(new Events(), { hidden: false, activeElement: null });
  const media = Object.assign(new Events(), { matches: false });
  const timers = new Map(), queued = [], announcements = [];
  let serial = 0, time = 0;
  const window = Object.assign(new Events(), {
    matchMedia: () => media,
    setTimeout(callback, delay) { const id = ++serial; timers.set(id, { callback, at: time + delay }); queued.push(callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const nodes = new Set();
  function node(tagName = 'DIV') {
    const classes = new Set();
    const item = { hidden: false, disabled: false, tagName, textContent: '', dataset: {},
      focus() { document.activeElement = this; },
      classList: { add: value => classes.add(value), remove: value => classes.delete(value), toggle(value, enabled) { enabled ? classes.add(value) : classes.delete(value); } },
    };
    nodes.add(item); return item;
  }
  const actions = Object.fromEntries(['pack-open', 'pack-skip', 'pack-show-all', 'pack-ack'].map(action => [action, node('BUTTON')]));
  const scene = node(), cards = node(), status = node();
  const slots = Array.from({ length: 3 }, () => {
    const slot = node(), face = node(), label = node(), back = node('BUTTON');
    slot.back = back;
    slot.querySelector = selector => selector === '[data-pack-face]' ? face : selector === '[data-pack-label]' ? label : back;
    return slot;
  });
  const element = Object.assign(node(), { isConnected: true, dataset: { receiptId: 'wx01-1' }, contains: item => nodes.has(item) });
  element.querySelector = selector => selector === '[data-pack-scene]' ? scene : selector === '[data-pack-cards]' ? cards : selector === '[data-pack-status]' ? status
    : selector.startsWith('[data-pack-slot=') ? slots[Number(selector.match(/"(\d+)"/)[1])] : actions[selector.match(/"([^\"]+)"/)[1]];
  element.querySelectorAll = selector => selector === '[data-pack-slot]' ? slots : slots.map(slot => slot.back);
  const receipt = Object.freeze({ id: 'wx01-1', kind: 'pack', mode: 'god', cost: 300, cards: Object.freeze([
    Object.freeze({ cardId: 'tangsanzang', printId: 'wx01-001-aa1', instanceId: 'card-000100' }),
    Object.freeze({ cardId: 'niumowang', printId: 'wx01-015-laa1', instanceId: 'card-000101' }),
    Object.freeze({ cardId: 'wukong', printId: 'wx01-005-ink1', instanceId: 'card-000102' }),
  ]) });
  const preferences = { reduce, fast };
  const controller = createPackOpeningController({ element, receipt, document, window, reducedMotion: () => preferences.reduce, pace: () => preferences.fast ? 'fast' : 'normal', announce: value => announcements.push(value) });
  function advance(ms) {
    const until = time + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, value]) => value.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at; timers.delete(next[0]); next[1].callback();
    }
    time = until;
  }
  return { controller, element, receipt, document, window, media, preferences, timers, queued, announcements, actions, slots, scene, cards, status, advance };
}

test('accepted receipt opens briefly, then requires deliberate reveals and keeps focus on available controls', () => {
  const env = environment(), { controller: ui, actions } = env;
  assert.equal(ui.getState().phase, 'sealed');
  ui.open(); assert.equal(ui.getState().phase, 'opening');
  assert.equal(env.document.activeElement, actions['pack-skip']);
  env.advance(160); assert.equal(env.element.dataset.phase, 'unsealed');
  env.advance(140); assert.equal(ui.getState().phase, 'ready');
  assert.equal(env.document.activeElement, env.slots[0].back);
  ui.reveal(0); ui.reveal(0); ui.reveal(99);
  assert.deepEqual(ui.getState().revealed, [0]);
  assert.equal(env.document.activeElement, env.slots[1].back);
  ui.reveal(2); ui.reveal(1);
  assert.equal(ui.getState().phase, 'complete');
  assert.equal(env.document.activeElement, actions['pack-ack']);
  assert.equal(env.announcements.length, 3);
  assert.equal(env.announcements[1], '第 3 張：孫悟空 · 大鬧天宮，墨卷，卡牌編號 card-000102。已入藏。');
  assert.equal(actions['pack-skip'].hidden, true);
  assert.equal(actions['pack-ack'].hidden, false);
  assert.equal(env.receipt.cost, 300);
  ui.destroy();
});

test('skip cancels queued transitions; replay uses the same immutable receipt without RNG', () => {
  const env = environment();
  env.controller.open(); env.advance(160);
  env.controller.finish({ focus: true });
  assert.equal(env.timers.size, 0);
  assert.deepEqual(env.controller.getState().revealed, [0, 1, 2]);
  env.advance(1000); env.controller.open(); env.controller.reveal(0);
  assert.equal(env.controller.getState().phase, 'complete');
  assert.equal(env.announcements.length, 0);
  env.controller.destroy();
  const replay = environment();
  const native = Math.random; Math.random = () => { throw Error('Presentation consumed RNG'); };
  try { replay.controller.finish(); assert.equal(replay.controller.getState().receiptId, 'wx01-1'); }
  finally { Math.random = native; replay.controller.destroy(); }
});

test('system/user reduced motion and fast pace immediately show accepted final cards', () => {
  for (const config of [{ reduce: true }, { fast: true }]) {
    const env = environment(config); env.controller.open();
    assert.equal(env.controller.getState().phase, 'complete');
    assert.equal(env.timers.size, 0); env.controller.destroy();
  }
  const env = environment(); env.controller.open(); env.media.matches = true; env.media.emit('change');
  assert.equal(env.controller.getState().phase, 'complete');
  assert.equal(env.timers.size, 0); env.controller.destroy();
});

test('hidden page and user preference changes finish without stealing focus or replaying on return', () => {
  const env = environment(); env.controller.open(); env.window.emit('pagehide');
  assert.equal(env.controller.getState().phase, 'complete');
  assert.equal(env.timers.size, 0);
  env.window.emit('pageshow'); env.advance(1000);
  assert.equal(env.controller.getState().phase, 'complete'); env.controller.destroy();
  const ready = environment(); ready.controller.open(); ready.advance(300);
  ready.preferences.reduce = true; ready.controller.syncPreferences();
  assert.equal(ready.controller.getState().phase, 'complete'); ready.controller.destroy();
});

test('destroy removes lifecycle listeners and prevents stale timers painting a replacement modal', () => {
  const env = environment(); env.controller.open();
  const queued = [...env.queued]; env.controller.destroy();
  assert.equal(env.timers.size, 0);
  assert.equal(env.document.count() + env.window.count() + env.media.count(), 0);
  const phase = env.element.dataset.phase;
  queued.forEach(callback => callback());
  env.controller.finish(); env.controller.open(); env.controller.reveal(0);
  assert.equal(env.element.dataset.phase, phase);
});
