/** Optional presentation only: no battle state, rules, rewards or profile storage. */
export const EXPERIENCE_KEY = 'shanhai.experience.v1';

const DEFAULTS = Object.freeze({ sound: false, ambience: 0.35, effects: 0.6, motion: 'system', pace: 'normal' });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
const volume = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

export function normalizePreferences(raw) {
  const value = record(raw);
  return {
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULTS.sound,
    ambience: volume(value.ambience, DEFAULTS.ambience),
    effects: volume(value.effects, DEFAULTS.effects),
    motion: value.motion === 'reduce' ? 'reduce' : 'system',
    pace: value.pace === 'fast' ? 'fast' : 'normal',
  };
}

const TONES = Object.freeze({
  select: [540, 620, 0.06, 'sine'], pill: [720, 660, 0.045, 'sine'],
  commit: [180, 125, 0.18, 'sine'], reveal: [460, 640, 0.18, 'sine'],
  impact: [125, 85, 0.12, 'triangle'], win: [520, 780, 0.28, 'sine'],
  lose: [260, 220, 0.22, 'sine'], draw: [330, 390, 0.22, 'sine'],
});
const PHASE_LABELS = { sealed: '雙方落子，準備揭曉。', bids: '仙丹揭曉。', impact: '勝負已定。', complete: '揭曉完成。' };

export function createExperienceController({ storage, document, window, onPreferencesChange } = {}) {
  let preferences;
  try { preferences = normalizePreferences(JSON.parse(storage?.getItem(EXPERIENCE_KEY) ?? 'null')); }
  catch { preferences = normalizePreferences(null); }
  let destroyed = false, pageHidden = false, scene = false, unlocked = false;
  let context = null, master = null, effects = null, ambient = null, resumeTask = null, activeReveal = null;
  const voices = new Set();
  const schedule = window?.setTimeout ? window.setTimeout.bind(window) : globalThis.setTimeout.bind(globalThis);
  const cancel = window?.clearTimeout ? window.clearTimeout.bind(window) : globalThis.clearTimeout.bind(globalThis);
  let media;
  try { media = window?.matchMedia?.('(prefers-reduced-motion: reduce)'); } catch {}
  const getPreferences = () => ({ ...preferences });
  const reducedMotion = () => preferences.motion === 'reduce' || media?.matches === true;
  const hidden = () => pageHidden || document?.hidden === true;
  const audioAllowed = () => !destroyed && unlocked && preferences.sound && !hidden();
  const notify = () => { try { onPreferencesChange?.(getPreferences()); } catch {} };

  function disconnect(nodes) { for (const node of nodes) try { node.disconnect(); } catch {} }
  function stopVoice(voice) {
    voices.delete(voice);
    voice.source.onended = null;
    try { voice.source.stop(); } catch {}
    disconnect([voice.source, voice.gain]);
  }
  function stopAmbience() {
    if (!ambient) return;
    const prior = ambient; ambient = null;
    try { prior.source.stop(); } catch {}
    disconnect([prior.source, prior.filter, prior.gain]);
  }
  function setGain(param, value) {
    if (!param || !context) return;
    param.cancelScheduledValues(context.currentTime);
    param.setValueAtTime(value, context.currentTime);
  }
  function suspendAudio() {
    stopAmbience();
    for (const voice of [...voices]) stopVoice(voice);
    if (context && context.state !== 'closed') try { Promise.resolve(context.suspend()).catch(() => {}); } catch {}
  }
  function syncAmbience() {
    if (!audioAllowed() || !scene || preferences.ambience === 0 || context?.state !== 'running') { stopAmbience(); return; }
    if (ambient) {
      // Ordinary rerenders must not cancel an in-progress onset envelope.
      if (ambient.volume !== preferences.ambience) {
        setGain(ambient.gain.gain, preferences.ambience * 0.045);
        ambient.volume = preferences.ambience;
      }
      return;
    }
    let source, filter, gain;
    try {
      // Private deterministic noise: audio must never consume the game's random stream.
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
      const samples = buffer.getChannelData(0);
      let seed = 0x6d2b79f5, previous = 0;
      for (let i = 0; i < samples.length; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        const white = (seed >>> 0) / 0x100000000 * 2 - 1;
        previous = (previous + white * 0.025) / 1.025;
        samples[i] = previous * 3;
      }
      // A short cosine taper joins the loop at silence without a sample jump.
      const edge = Math.max(2, Math.min(Math.floor(samples.length / 2), Math.ceil(context.sampleRate * 0.012)));
      for (let i = 0; i < edge; i++) {
        const taper = (1 - Math.cos(Math.PI * i / (edge - 1))) / 2;
        samples[i] *= taper;
        samples[samples.length - 1 - i] *= taper;
      }
      source = context.createBufferSource(); filter = context.createBiquadFilter(); gain = context.createGain();
      source.buffer = buffer; source.loop = true; filter.type = 'lowpass';
      filter.frequency.value = 720; filter.Q.value = 0.25;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(preferences.ambience * 0.045, context.currentTime + 0.14);
      source.connect(filter); filter.connect(gain); gain.connect(master);
      ambient = { source, filter, gain, volume: preferences.ambience }; source.start();
    } catch {
      if (ambient?.source === source) ambient = null;
      try { source?.stop(); } catch {}
      disconnect([source, filter, gain].filter(Boolean));
    }
  }
  function resumeExisting() {
    if (!context || !audioAllowed()) return Promise.resolve(false);
    if (context.state === 'running') { syncAmbience(); return Promise.resolve(true); }
    if (resumeTask) return resumeTask;
    const current = context;
    try {
      const task = Promise.resolve(current.resume()).then(() => {
        if (current !== context || !audioAllowed()) {
          if (current.state !== 'closed') try { Promise.resolve(current.suspend()).catch(() => {}); } catch {}
          return false;
        }
        syncAmbience(); return current.state === 'running';
      }).catch(() => false);
      resumeTask = task;
      task.finally(() => { if (resumeTask === task) resumeTask = null; });
      return task;
    } catch { return Promise.resolve(false); }
  }
  /** Call directly from a player gesture, after sound has been enabled. */
  function unlockAudio() {
    if (destroyed || !preferences.sound || hidden() || window?.navigator?.userActivation?.isActive === false) return Promise.resolve(false);
    if (!context) {
      const AudioContext = window?.AudioContext || window?.webkitAudioContext;
      if (!AudioContext) return Promise.resolve(false);
      try {
        context = new AudioContext(); master = context.createGain(); effects = context.createGain();
        master.gain.value = 1; effects.gain.value = preferences.effects * 0.15;
        effects.connect(master); master.connect(context.destination);
      } catch {
        try { Promise.resolve(context?.close()).catch(() => {}); } catch {}
        context = null; master = null; effects = null; return Promise.resolve(false);
      }
    }
    unlocked = true;
    return resumeExisting();
  }
  function cue(kind) {
    const tone = TONES[kind];
    if (!tone || !audioAllowed() || preferences.effects === 0 || context?.state !== 'running') return false;
    let source, gain;
    try {
      while (voices.size >= 6) stopVoice(voices.values().next().value);
      const [from, to, duration, type] = tone, now = context.currentTime;
      source = context.createOscillator(); gain = context.createGain();
      source.type = type; source.frequency.setValueAtTime(from, now); source.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.18, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(gain); gain.connect(effects);
      const voice = { source, gain }; voices.add(voice);
      source.onended = () => { voices.delete(voice); disconnect([source, gain]); };
      source.start(now); source.stop(now + duration + 0.02); return true;
    } catch {
      const voice = [...voices].find(item => item.source === source);
      if (voice) stopVoice(voice);
      else { try { source?.stop(); } catch {} disconnect([source, gain].filter(Boolean)); }
      return false;
    }
  }
  function setScene(active) { if (destroyed) return; scene = active === true; syncAmbience(); }

  function phase(element, value) {
    element.dataset.phase = value;
    const label = element.querySelector?.('[data-reveal-status]');
    if (label) label.textContent = PHASE_LABELS[value];
  }
  function complete(element) {
    phase(element, 'complete'); element.dataset.revealState = 'complete';
    const skip = element.querySelector?.('[data-action="skip-reveal"]');
    if (!skip) return;
    if (document?.activeElement === skip || skip.contains?.(document?.activeElement)) {
      const next = element.querySelector('[data-action="next-round"]:not(:disabled)')
        || [...(element.querySelectorAll?.('button:not(:disabled),a[href],[tabindex="0"]') || [])].find(node => node !== skip && !node.hidden);
      if (next) next.focus({ preventScroll: true });
      else { if (!element.hasAttribute?.('tabindex')) element.setAttribute?.('tabindex', '-1'); element.focus?.({ preventScroll: true }); }
    }
    skip.hidden = true; skip.disabled = true;
  }
  function finishReveal() {
    if (!activeReveal) return;
    const prior = activeReveal; activeReveal = null;
    for (const timer of prior.timers) cancel(timer);
    prior.timers.clear(); complete(prior.element);
  }
  function reveal(element, { animate = true } = {}) {
    finishReveal();
    if (!element?.dataset) return;
    if (destroyed || !animate || reducedMotion() || preferences.pace === 'fast' || hidden()) { complete(element); return; }
    const current = { element, timers: new Set() }; activeReveal = current;
    element.dataset.revealState = 'animating'; phase(element, 'sealed');
    const skip = element.querySelector?.('[data-action="skip-reveal"]');
    if (skip) { skip.hidden = false; skip.disabled = false; }
    for (const [delay, value, sound] of [[100, 'bids', 'reveal'], [390, 'impact', 'impact'], [760, 'complete', null]]) {
      const timer = schedule(() => {
        current.timers.delete(timer);
        if (activeReveal !== current) return;
        if (hidden() || element.isConnected === false || value === 'complete') { finishReveal(); return; }
        phase(element, value); cue(sound);
      }, delay);
      current.timers.add(timer);
    }
  }
  function setPreferences(patch) {
    if (destroyed) return getPreferences();
    preferences = normalizePreferences({ ...preferences, ...record(patch) });
    try { storage?.setItem(EXPERIENCE_KEY, JSON.stringify(preferences)); } catch {}
    if (reducedMotion() || preferences.pace === 'fast') finishReveal();
    setGain(master?.gain, preferences.sound ? 1 : 0);
    setGain(effects?.gain, preferences.effects * 0.15);
    if (!preferences.effects) for (const voice of [...voices]) stopVoice(voice);
    if (!audioAllowed()) suspendAudio();
    else { syncAmbience(); void resumeExisting(); }
    notify(); return getPreferences();
  }
  function motionChanged() { if (destroyed) return; if (reducedMotion()) finishReveal(); notify(); }
  function visibilityChanged() {
    if (destroyed) return;
    if (hidden()) { finishReveal(); suspendAudio(); }
    else void resumeExisting();
  }
  function pageHide() { pageHidden = true; visibilityChanged(); }
  function pageShow() { pageHidden = false; visibilityChanged(); }
  document?.addEventListener?.('visibilitychange', visibilityChanged);
  window?.addEventListener?.('pagehide', pageHide);
  window?.addEventListener?.('pageshow', pageShow);
  if (media?.addEventListener) media.addEventListener('change', motionChanged);
  else media?.addListener?.(motionChanged);
  function destroy() {
    if (destroyed) return;
    destroyed = true; finishReveal(); suspendAudio();
    document?.removeEventListener?.('visibilitychange', visibilityChanged);
    window?.removeEventListener?.('pagehide', pageHide);
    window?.removeEventListener?.('pageshow', pageShow);
    if (media?.removeEventListener) media.removeEventListener('change', motionChanged);
    else media?.removeListener?.(motionChanged);
    disconnect([effects, master].filter(Boolean));
    try { Promise.resolve(context?.close()).catch(() => {}); } catch {}
    context = null; master = null; effects = null;
  }
  return { getPreferences, setPreferences, reducedMotion, unlockAudio, cue, setScene, reveal, finishReveal, destroy };
}
