import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPERIENCE_KEY, normalizePreferences, createExperienceController } from '../experience.mjs';

class Events {
  listeners = new Map();
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type) { for (const callback of this.listeners.get(type) || []) callback(); }
  count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0); }
}
function environment(raw = null) {
  const document = Object.assign(new Events(), { hidden: false, activeElement: null });
  const media = Object.assign(new Events(), { matches: false });
  const timers = new Map(), scheduled = [], writes = [];
  let now = 0, serial = 0;
  const window = Object.assign(new Events(), {
    navigator: { userActivation: { isActive: true } },
    matchMedia: () => media,
    setTimeout(callback, delay) { const id = ++serial; timers.set(id, { at: now + delay, callback }); scheduled.push(callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const storage = {
    getItem(key) { assert.equal(key, EXPERIENCE_KEY); return raw; },
    setItem(key, value) { writes.push({ key, value }); },
  };
  function advance(ms) {
    const until = now + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, value]) => value.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].callback();
    }
    now = until;
  }
  return { document, window, storage, media, timers, scheduled, writes, advance };
}
function dialog(env, { next = true } = {}) {
  const attributes = new Map();
  const node = { dataset: {}, isConnected: true, status: { textContent: '' },
    focus() { env.document.activeElement = this; },
    hasAttribute: name => attributes.has(name), setAttribute: (name, value) => attributes.set(name, value),
  };
  node.skip = { hidden: false, disabled: false, contains: target => target === node.skip,
    focus() { env.document.activeElement = this; } };
  node.next = next ? { hidden: false, disabled: false, focus() { env.document.activeElement = this; } } : null;
  node.querySelector = selector => selector === '[data-reveal-status]' ? node.status
    : selector === '[data-action="skip-reveal"]' ? node.skip : node.next;
  node.querySelectorAll = () => [node.skip, node.next].filter(Boolean);
  return node;
}
function fakeAudio(env, { deferredResume = false, sampleRate = 100 } = {}) {
  const contexts = [], pending = [];
  class Parameter {
    value = 0; events = [];
    cancelScheduledValues(at) { this.events.push({ kind: 'cancel', at }); }
    setValueAtTime(value, at) { this.value = value; this.events.push({ kind: 'set', value, at }); }
    linearRampToValueAtTime(value, at) { this.value = value; this.events.push({ kind: 'linear', value, at }); }
    exponentialRampToValueAtTime(value, at) { this.value = value; this.events.push({ kind: 'exponential', value, at }); }
  }
  class Node {
    disconnected = false; stopped = false; started = false;
    gain = new Parameter(); frequency = new Parameter(); Q = new Parameter();
    connect(target) { this.output = target; }
    disconnect() { this.disconnected = true; }
    start() { this.started = true; }
    stop(at) { if (at === undefined) this.stopped = true; }
  }
  env.window.AudioContext = class {
    state = 'suspended'; currentTime = 0; sampleRate = sampleRate; destination = {}; nodes = []; buffers = []; resumes = 0; suspends = 0; closes = 0;
    constructor() { contexts.push(this); }
    node(kind) { const node = Object.assign(new Node(), { kind }); this.nodes.push(node); return node; }
    createGain() { return this.node('gain'); }
    createOscillator() { return this.node('oscillator'); }
    createBufferSource() { return this.node('buffer-source'); }
    createBiquadFilter() { return this.node('filter'); }
    createBuffer(channels, size) { const values = new Float32Array(size); this.buffers.push(values); return { getChannelData: () => values }; }
    resume() {
      this.resumes++;
      if (deferredResume) return new Promise(resolve => pending.push(() => { this.state = 'running'; resolve(); }));
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { this.suspends++; this.state = 'suspended'; return Promise.resolve(); }
    close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
  };
  return { contexts, pending, sources: () => contexts.flatMap(context => context.nodes.filter(node => node.kind === 'buffer-source')) };
}
const defaults = { sound: false, ambience: 0.35, effects: 0.6, motion: 'system', pace: 'normal' };

test('preferences accept only the documented values and clamp finite numeric volumes', () => {
  for (const raw of [null, undefined, [], 'true', { sound: 'true', ambience: '1', effects: NaN, motion: true, pace: 'slow' }]) {
    assert.deepEqual(normalizePreferences(raw), defaults);
  }
  assert.deepEqual(normalizePreferences({ sound: true, ambience: -1, effects: 5, motion: 'reduce', pace: 'fast', profile: {} }),
    { sound: true, ambience: 0, effects: 1, motion: 'reduce', pace: 'fast' });
  assert.equal(normalizePreferences({ ambience: Infinity }).ambience, 0.35);
});

test('only preferences are persisted, copies are isolated, and storage failure leaves controls usable', () => {
  const env = environment('{invalid');
  const changes = [];
  const controller = createExperienceController({ ...env, onPreferencesChange: value => changes.push(value) });
  assert.deepEqual(controller.getPreferences(), defaults);
  assert.equal(changes.length, 0, 'Construction does not invoke a callback before the controller exists');
  const edited = controller.getPreferences(); edited.sound = true;
  assert.equal(controller.getPreferences().sound, false);
  controller.setPreferences({ sound: true, effects: 0.4, coins: 999 });
  assert.deepEqual(env.writes, [{ key: EXPERIENCE_KEY, value: JSON.stringify({ ...defaults, sound: true, effects: 0.4 }) }]);
  changes[0].effects = 0;
  assert.equal(controller.getPreferences().effects, 0.4);
  env.storage.setItem = () => { throw Error('quota'); };
  assert.doesNotThrow(() => controller.setPreferences({ motion: 'reduce' }));
  assert.equal(controller.reducedMotion(), true);
  controller.destroy();
  const blocked = createExperienceController({ storage: { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } } });
  assert.deepEqual(blocked.getPreferences(), defaults);
  assert.equal(blocked.setPreferences({ pace: 'fast' }).pace, 'fast');
  blocked.destroy();
});

test('reveals progress through public phases without game callbacks or persistence', () => {
  const env = environment(), controller = createExperienceController(env), element = dialog(env);
  controller.reveal(element);
  assert.deepEqual(element.dataset, { revealState: 'animating', phase: 'sealed' });
  assert.equal(env.timers.size, 3);
  env.advance(100); assert.equal(element.dataset.phase, 'bids');
  env.advance(290); assert.equal(element.dataset.phase, 'impact');
  element.skip.focus(); env.advance(370);
  assert.deepEqual(element.dataset, { revealState: 'complete', phase: 'complete' });
  assert.equal(element.skip.hidden, true);
  assert.equal(element.skip.disabled, true);
  assert.equal(env.document.activeElement, element.next);
  assert.equal(env.timers.size, 0);
  assert.deepEqual(env.writes, []);
  controller.destroy();
});

test('skip and replacement clear every timeout, ignore stale callbacks and never hide focused skip', () => {
  const env = environment(), controller = createExperienceController(env), first = dialog(env), second = dialog(env, { next: false });
  controller.reveal(first); const stale = [...env.scheduled];
  controller.reveal(second);
  assert.equal(first.dataset.phase, 'complete');
  for (const callback of stale) callback();
  assert.equal(second.dataset.phase, 'sealed');
  second.skip.focus(); controller.finishReveal(); controller.finishReveal();
  assert.equal(env.document.activeElement, second);
  assert.equal(second.hasAttribute('tabindex'), true);
  assert.equal(env.timers.size, 0);
  for (const callback of env.scheduled) callback();
  assert.equal(first.dataset.phase, 'complete'); assert.equal(second.dataset.phase, 'complete');
  controller.destroy();
});

test('fast, reduced motion, system changes and lifecycle interruptions always produce complete results', () => {
  const env = environment(), changes = [], controller = createExperienceController({ ...env, onPreferencesChange: value => changes.push(value) });
  const run = () => { const element = dialog(env); controller.reveal(element); return element; };
  const fast = run(); controller.setPreferences({ pace: 'fast' });
  assert.equal(fast.dataset.phase, 'complete'); assert.equal(run().dataset.phase, 'complete');
  controller.setPreferences({ pace: 'normal' });
  const system = run(); env.media.matches = true; env.media.emit('change');
  assert.equal(system.dataset.phase, 'complete'); assert.equal(controller.reducedMotion(), true);
  assert.equal(changes.at(-1).motion, 'system');
  env.media.matches = false; env.media.emit('change');
  const explicit = run(); controller.setPreferences({ motion: 'reduce' });
  assert.equal(explicit.dataset.phase, 'complete');
  controller.setPreferences({ motion: 'system' });
  const hidden = run(); env.document.hidden = true; env.document.emit('visibilitychange');
  assert.equal(hidden.dataset.phase, 'complete'); assert.equal(run().dataset.phase, 'complete');
  env.document.hidden = false; env.document.emit('visibilitychange');
  const leave = run(); env.window.emit('pagehide');
  assert.equal(leave.dataset.phase, 'complete'); assert.equal(run().dataset.phase, 'complete');
  env.window.emit('pageshow');
  const staticResult = dialog(env); controller.reveal(staticResult, { animate: false });
  assert.equal(staticResult.dataset.phase, 'complete'); assert.equal(env.timers.size, 0);
  const final = run(); controller.destroy();
  assert.equal(final.dataset.phase, 'complete'); assert.equal(env.timers.size, 0);
  assert.equal(env.document.count() + env.window.count() + env.media.count(), 0);
  const notified = changes.length; env.media.emit('change'); controller.setPreferences({ sound: true });
  assert.equal(changes.length, notified);
});

test('disconnected reveal finishes without later impact cues', () => {
  const env = environment(), controller = createExperienceController(env), element = dialog(env);
  controller.reveal(element); element.isConnected = false; env.advance(100);
  assert.equal(element.dataset.phase, 'complete'); assert.equal(env.timers.size, 0);
  controller.destroy();
});

test('skipping a public reveal cancels its remaining audio cues as well as motion', async () => {
  const env = environment(), audio = fakeAudio(env), controller = createExperienceController(env), element = dialog(env);
  assert.equal(await controller.unlockAudio(), false, 'A first-run gesture alone does not enable sound');
  assert.equal(audio.contexts.length, 0);
  controller.setPreferences({ sound: true }); await controller.unlockAudio();
  const oscillators = () => audio.contexts[0].nodes.filter(node => node.kind === 'oscillator');
  controller.reveal(element);
  assert.equal(oscillators().length, 0);
  env.advance(100); assert.equal(oscillators().length, 1);
  controller.finishReveal(); env.advance(1000);
  assert.equal(oscillators().length, 1);
  for (const callback of env.scheduled) callback();
  assert.equal(oscillators().length, 1);
  controller.destroy();
});

test('audio requires enabled sound and an unlocking gesture, even with persisted preferences', async () => {
  const env = environment(JSON.stringify({ sound: true })), audio = fakeAudio(env), controller = createExperienceController(env);
  controller.setScene(true); controller.cue('select'); controller.setPreferences({ effects: 0.5 });
  env.document.emit('visibilitychange'); env.window.emit('pageshow');
  assert.equal(audio.contexts.length, 0);
  env.window.navigator.userActivation.isActive = false;
  assert.equal(await controller.unlockAudio(), false); assert.equal(audio.contexts.length, 0);
  env.window.navigator.userActivation.isActive = true;
  assert.equal(await controller.unlockAudio(), true); assert.equal(audio.contexts.length, 1);
  assert.equal(controller.cue('pill'), true);
  const context = audio.contexts[0];
  assert.equal(context.nodes.filter(node => node.kind === 'oscillator').length, 1);
  controller.setPreferences({ sound: false });
  assert.equal(context.state, 'suspended'); assert.equal(context.nodes[0].gain.value, 0);
  assert.equal(controller.cue('commit'), false); assert.equal(await controller.unlockAudio(), false);
  controller.destroy(); assert.equal(context.state, 'closed');
});

test('ambience never stacks or touches gameplay randomness; hidden, scene-off and mute release sources', async () => {
  const env = environment(), audio = fakeAudio(env), controller = createExperienceController(env);
  controller.setPreferences({ sound: true }); await controller.unlockAudio();
  const originalRandom = Math.random;
  try {
    Math.random = () => { throw Error('Audio consumed gameplay randomness'); };
    controller.setScene(true);
    assert.equal(audio.sources().length, 1); assert.equal(audio.sources()[0].started, true);
  } finally { Math.random = originalRandom; }
  controller.setScene(true); controller.setPreferences({ ambience: 0.7 });
  assert.equal(audio.sources().length, 1);
  const context = audio.contexts[0];
  assert(context.buffers[0].some(sample => sample !== 0));
  controller.cue('select');
  env.document.hidden = true; env.document.emit('visibilitychange');
  assert.equal(context.state, 'suspended'); assert.equal(audio.sources()[0].stopped, true);
  assert(context.nodes.filter(node => node.kind === 'oscillator').every(node => node.stopped && node.disconnected));
  env.document.hidden = false; env.document.emit('visibilitychange'); await Promise.resolve();
  assert.equal(audio.sources().length, 2);
  env.document.emit('visibilitychange'); await Promise.resolve(); assert.equal(audio.sources().length, 2);
  controller.setScene(false); assert.equal(audio.sources()[1].stopped, true);
  controller.setScene(true); assert.equal(audio.sources().length, 3);
  controller.setPreferences({ ambience: 0 }); assert.equal(audio.sources()[2].stopped, true);
  controller.setPreferences({ ambience: 0.35 }); assert.equal(audio.sources().length, 4);
  controller.setPreferences({ sound: false }); assert.equal(audio.sources()[3].stopped, true);
  controller.destroy(); assert.equal(context.closes, 1);
});

test('ambience onset stays gentle through rerenders and loop edges join without a sample jump', async () => {
  for (const sampleRate of [44100, 48000]) {
    const env = environment(), audio = fakeAudio(env, { sampleRate }), controller = createExperienceController(env);
    controller.setPreferences({ sound: true }); await controller.unlockAudio();
    const context = audio.contexts[0]; context.currentTime = 3;
    controller.setScene(true);
    const source = audio.sources()[0], gain = source.output.output.gain;
    const onset = [{ kind: 'set', value: 0, at: 3 }, { kind: 'linear', value: 0.35 * 0.045, at: 3.14 }];
    assert.deepEqual(gain.events, onset, 'The new ambience starts silent and reaches its chosen volume in 140 ms');
    controller.setScene(true); controller.setPreferences({ effects: 0.4 }); await controller.unlockAudio();
    assert.equal(audio.sources().length, 1);
    assert.deepEqual(gain.events, onset, 'Scene refreshes and unrelated preferences preserve the onset automation');
    assert.equal(source.loop, true);
    const samples = context.buffers[0];
    assert.equal(samples.length, sampleRate * 2);
    assert.equal(Math.abs(samples[0]), 0); assert.equal(Math.abs(samples.at(-1)), 0);
    assert(Math.abs(samples[1]) < 0.00001 && Math.abs(samples.at(-2)) < 0.00001, 'The join approaches silence gradually on both sides');
    assert(samples.slice(sampleRate / 2, sampleRate).some(sample => Math.abs(sample) > 0.01), 'Edge smoothing does not silence the soundscape');
    controller.setScene(false);
    assert(source.stopped && source.disconnected, 'Leaving does not defer source cleanup until the onset ends');
    controller.setScene(true);
    assert.deepEqual(context.buffers[1], samples, 'Loop construction is deterministic across scene entries');
    controller.setPreferences({ sound: false });
    assert(audio.sources().every(node => node.stopped && node.disconnected), 'Muting stops even a newly started envelope immediately');
    assert.equal(env.timers.size, 0, 'Ambience envelopes need no JavaScript cleanup timers');
    controller.destroy();
  }
});

test('a delayed audio resume cannot restart ambience after hide or destruction', async () => {
  for (const interrupt of ['hide', 'destroy']) {
    const env = environment(), audio = fakeAudio(env, { deferredResume: true }), controller = createExperienceController(env);
    controller.setPreferences({ sound: true }); controller.setScene(true);
    const unlocked = controller.unlockAudio();
    if (interrupt === 'hide') { env.window.emit('pagehide'); } else controller.destroy();
    audio.pending.shift()();
    assert.equal(await unlocked, false);
    assert.equal(audio.sources().length, 0);
    assert.notEqual(audio.contexts[0].state, 'running');
    controller.destroy();
  }
});

test('effects volume applies immediately, ended voices disconnect, and unsupported audio is harmless', async () => {
  const env = environment(), audio = fakeAudio(env), controller = createExperienceController(env);
  controller.setPreferences({ sound: true }); await controller.unlockAudio();
  for (const kind of ['select', 'pill', 'commit', 'reveal', 'impact', 'win', 'lose', 'draw']) assert.equal(controller.cue(kind), true);
  assert.equal(controller.cue('unknown'), false);
  const context = audio.contexts[0], oscillators = context.nodes.filter(node => node.kind === 'oscillator');
  assert(oscillators.slice(0, 2).every(node => node.stopped && node.disconnected), 'Rapid input has a bounded voice count');
  oscillators.at(-1).onended(); assert.equal(oscillators.at(-1).disconnected, true);
  controller.setPreferences({ effects: 0 });
  assert.equal(context.nodes[1].gain.value, 0); assert.equal(controller.cue('select'), false);
  assert(oscillators.every(node => node.disconnected));
  controller.destroy();
  const unsupported = createExperienceController({ window: {} });
  unsupported.setPreferences({ sound: true }); assert.equal(await unsupported.unlockAudio(), false);
  assert.equal(unsupported.cue('select'), false); unsupported.destroy();
});
