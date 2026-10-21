/** T1 first-visit teaching (docs/TUTORIAL-T1.md): the rules-first route, the 初見 hints'
 * registry and their device-local record. Pure: no DOM, no randomness, no profile writes and
 * no storage of its own (createGuideMemory is handed one). */
import { RULES } from './engine.mjs';
import { MAX_DECK_SLOTS, getActiveDeck } from './collection.mjs';
import { NODES, getExpansionSummary, isNodeUnlocked, ACTIVITY_PILL_FLOOR } from './progression.mjs';

/** Device-local, beside shanhai.coach.v1 and shanhai.experience.v1: never in the profile, a
 * battle snapshot, an export, a backup or the native mirror. */
export const GUIDE_KEY = 'shanhai.guide.v1';
/** The first expedition, where D3's first-battle coach runs (battle-teaching.mjs FIRST_NODE). */
export const FIRST_EXPEDITION = 'mist-gate';
/** Visit hints are for newcomers: a journey with this many finished battles sees none
 * (docs/TUTORIAL-T1.md §2.1 item 5; open question 11). */
export const NEWCOMER_BATTLES = 10;
/** The lobby's first visit (navigation-ui.mjs lobbyMarkup): no battle finished, none in progress. */
export const isFirstVisit = profile => profile?.stats?.played === 0 && !profile?.pending;
export const isNewcomer = profile => profile?.stats?.played < NEWCOMER_BATTLES;
/** Where the rules dialog's 知其道，入其局 leads (docs/TUTORIAL-T1.md §1): on a first visit the
 * 霧隱渡口 preparation, so a player who reads the rules first still meets D3's coach;
 * otherwise 自由切磋, as before. Decided at tap time from the profile alone. */
export function rulesStartRoute(profile) {
  return Object.freeze(isFirstVisit(profile)
    ? { kind: 'expedition', nodeId: FIRST_EXPEDITION }
    : { kind: 'practice', nodeId: null });
}
/** The screen channel's visit key (§2.1 item 6): the screen, or bag-cards / bag-decks. Unlike
 * app.mjs viewKey(), it does not change when the bag's layout changes or a character opens. */
export const guideScreenKey = (screen, bagTab) => screen === 'bag' ? `bag-${bagTab === 'decks' ? 'decks' : 'cards'}` : screen;
/** The highest card level in the active deck, 1 if none (world-level's condition). */
export function activeDeckTopLevel(profile) {
  const levels = (getActiveDeck(profile)?.instanceIds ?? [])
    .map(uid => profile.instances?.find(instance => instance.uid === uid)?.level).filter(Number.isFinite);
  return levels.length ? Math.max(...levels) : 1;
}
const selectedNodeOf = ctx => NODES.find(node => node.id === ctx.selectedNode) || NODES[0];
const freeze = value => { Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) freeze(item); }); return Object.freeze(value); };

/** The registry of §2.3. Each hint takes the place of one existing line (`slot.replace`),
 * may remove others (`slot.remove`), and is placed only where `slot.requires` matches.
 * `lasts`: 'condition' shows whenever `when` holds and is never recorded; 'visit' shows for
 * the whole of the first visit on which it is recorded, then never again. */
export const GUIDE_HINTS = freeze([
  {
    id: 'home-start', channel: 'screen', scene: key => key === 'home', voice: 'guardian', lasts: 'condition',
    // The route block is centred in the realm, so removing its footnote would lower 啟程遊歷:
    // the hint replaces the subtitle alone, in the one line the subtitle takes at 302 px.
    slot: { replace: '.lobby-route > p', remove: [], requires: '.lobby-continue[data-action="continue-journey"]' },
    when: ctx => isFirstVisit(ctx.profile),
    copy: ctx => ctx.coachSeen ? '燈在渡口等你，先落第一子。' : '燈在渡口等你，首局我陪你走。',
  },
  {
    id: 'arena-first', channel: 'screen', scene: key => key === 'arena', voice: 'guardian', lasts: 'condition',
    slot: { replace: '.arena-lobby-copy > .arena-fairness', remove: [], requires: null },
    when: ctx => isFirstVisit(ctx.profile),
    copy: ctx => ctx.coachSeen ? '擂台與切磋不急。先到遊歷的霧隱渡口，落下第一子。' : '擂台與切磋不急。先到遊歷的霧隱渡口，首局我陪你走一遍。',
  },
  {
    id: 'world-level', channel: 'screen', scene: key => key === 'world', voice: 'narrator', lasts: 'condition',
    slot: { replace: '.destination-panel > .destination-subtitle', remove: [], requires: null },
    when: ctx => {
      const node = selectedNodeOf(ctx);
      return isNewcomer(ctx.profile) && isNodeUnlocked(ctx.profile, node.id) && node.level > activeDeckTopLevel(ctx.profile);
    },
    copy: () => '建議 Lv 僅供參考，戰卡等級越高越穩。',
  },
  {
    id: 'bag-copies', channel: 'screen', scene: key => key === 'bag-cards', voice: 'narrator', lasts: 'visit',
    slot: { replace: '.bag-lead > .bag-overview', remove: [], requires: null },
    when: ctx => isNewcomer(ctx.profile),
    copy: () => '同名卡可藏多張，每張各記編號、畫作與歷練；哪張出牌，哪張得歷練。',
  },
  {
    id: 'bag-decks', channel: 'screen', scene: key => key === 'bag-decks', voice: 'narrator', lasts: 'visit',
    slot: { replace: '.bag-lead > .bag-overview', remove: [], requires: null },
    when: ctx => isNewcomer(ctx.profile) && ctx.profile.deckSlots?.length === 1,
    copy: () => `每套 ${RULES.deckSize} 位不同角色、總星數不超過 ${RULES.starLimit}；可存 ${MAX_DECK_SLOTS} 套，設為出戰的才上陣。`,
  },
  {
    id: 'market-printing', channel: 'screen', scene: key => key === 'market', voice: 'narrator', lasts: 'visit',
    slot: { replace: '.scene-wx01-offer .scene-pack-copy > p', remove: [], requires: null },
    when: ctx => isNewcomer(ctx.profile) && ctx.profile.wx01?.opened === 0,
    copy: () => '凡、靈、神品是品階，本畫、異畫是畫作；皆不改變星數與能力。',
  },
  {
    id: 'quests-why', channel: 'dialog', scene: key => key === 'quests', voice: 'narrator', lasts: 'visit',
    slot: { replace: '.daily-gift > p', remove: [], requires: null },
    when: ctx => isNewcomer(ctx.profile),
    // One line beside the 朝露 figure (about 191 px at 12 px): the gift's own heading, reward and
    // button already name it, so the line says what its coins and 靈砂 are for.
    copy: () => '朝露與功課，助你開匣修練。',
  },
  {
    id: 'fire-mountain', channel: 'dialog', scene: key => key === 'activity', voice: 'narrator', lasts: 'visit',
    slot: { replace: '.activity-arrival > p', remove: [], requires: null },
    // Never tried: no run now, and none ever started (startActivity increments expansion.serial).
    when: ctx => {
      const { activity } = getExpansionSummary(ctx.profile);
      return activity.unlocked && !activity.run && ctx.profile.expansion?.serial === 0;
    },
    // The overview's own line below already says a loss or draw ends the run; this one gives
    // the after-win recovery instead (progression.mjs settleActivity, expansion-ui.mjs rules).
    copy: () => `三戰相連：生命與仙丹帶到下一戰，勝後生命 +2、仙丹至少補至 ${ACTIVITY_PILL_FLOOR}，再選一項補給。`,
  },
]);
/** The dialog kinds that have hints: fitOverlay skips every other kind. */
export const GUIDE_DIALOG_KINDS = Object.freeze(['quests', 'activity']);
const VISIT_IDS = new Set(GUIDE_HINTS.filter(hint => hint.lasts === 'visit').map(hint => hint.id));

/** Hints whose scene and condition hold. ctx = { profile, key, selectedNode, coachSeen } is
 * read only. A condition that throws (an unexpected profile) places nothing. */
export function guideHints(ctx, channel) {
  return GUIDE_HINTS.filter(hint => {
    if (hint.channel !== channel || !hint.scene(ctx?.key)) return false;
    try { return Boolean(hint.when(ctx)); } catch { return false; }
  });
}

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
/** The hint's inner markup: one <span class="guide-hint-body"> holding the sr-only prefix, the
 * 「初見」 seal (narrator) or the guardian's visible label, and the escaped text. No control, no
 * focusable element, and no b, i or small, so a slot's own descendant rules cannot restyle it.
 * The role and data attribute belong to the element the adapter places (scene-adapters.mjs). */
export function hintMarkup(hint, ctx) {
  const text = escape(hint.copy(ctx));
  const voice = hint.voice === 'guardian'
    ? `<span class="guide-hint-voice">守渡弈者</span>「${text}」`
    : `<span class="guide-hint-seal" aria-hidden="true">初見</span>${text}`;
  return `<span class="guide-hint-body"><span class="sr-only">初見提點：</span>${voice}</span>`;
}

// ── shanhai.guide.v1 ───────────────────────────────────────────────────────────
const ID = /^[a-z0-9-]{1,40}$/;
const MAX_IDS = 64;
const EMPTY = Object.freeze({ seen: Object.freeze([]), off: false });
/** A record as stored: {"seen":[sorted ids]} plus "off":true only while hints are off. Unknown
 * ids that look like ids are kept, so an older build never drops a newer build's record. */
function normalize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const seen = Array.isArray(value.seen) ? [...new Set(value.seen.filter(id => typeof id === 'string' && ID.test(id)))].sort().slice(0, MAX_IDS) : [];
  return { seen, off: value.off === true };
}
const serialize = record => JSON.stringify({ seen: [...record.seen].sort(), ...(record.off ? { off: true } : {}) });

/**
 * The hints' device-local record under GUIDE_KEY, and the visits in progress (in memory).
 * A visit is one channel ('screen' or 'dialog') on one key: enter() returns its token, which
 * changes only when the key does (or after leave()). A visit hint is recorded only through
 * shown(), and stays pinned to the token it was recorded on, so it shows for the rest of that
 * visit. Writes happen only when something changes. A storage that throws, or a corrupt record,
 * reads as empty; the page's own copy then keeps working for the life of the page, and nothing
 * throws.
 */
export function createGuideMemory(storage) {
  let page = null, unsaved = false, serial = 0;
  const channels = { screen: { key: undefined, token: 0 }, dialog: { key: undefined, token: 0 } };
  const pins = new Map(), quiet = new Set();
  const stored = () => {
    try { return normalize(JSON.parse(storage?.getItem(GUIDE_KEY) ?? 'null')); } catch { return null; }
  };
  // Storage when it is readable and up to date; the page's own copy while a write has failed
  // or storage cannot be read.
  const record = () => (unsaved ? page : stored() ?? page) ?? EMPTY;
  const write = next => {
    const before = record();
    if (serialize(before) === serialize(next)) return;
    page = { seen: [...next.seen].sort(), off: next.off };
    try { storage?.setItem(GUIDE_KEY, serialize(page)); unsaved = false; } catch { unsaved = true; }
  };
  const channelOf = token => Object.values(channels).find(channel => token && channel.token === token) ?? null;
  return {
    enter(name, key) {
      const channel = channels[name];
      if (!channel) throw new RangeError('A guide channel is screen or dialog.');
      if (!channel.token || channel.key !== key) { channel.key = key; channel.token = ++serial; }
      return channel.token;
    },
    leave(name) {
      const channel = channels[name];
      if (channel) { channel.key = undefined; channel.token = 0; }
    },
    select(hints, token) {
      if (record().off || quiet.has(token)) return [];
      const seen = new Set(record().seen), pinned = pins.get(token);
      return (hints ?? []).filter(hint => hint.lasts !== 'visit' || !seen.has(hint.id) || pinned?.has(hint.id));
    },
    shown(ids, token) {
      if (!channelOf(token) || quiet.has(token)) return;
      const current = record();
      if (current.off) return;
      const visits = (ids ?? []).filter(id => VISIT_IDS.has(id));
      if (!visits.length) return;
      if (!pins.has(token)) pins.set(token, new Set());
      for (const id of visits) pins.get(token).add(id);
      write({ seen: [...new Set([...current.seen, ...visits])].slice(0, MAX_IDS), off: false });
    },
    enabled: () => !record().off,
    setEnabled(on) {
      pins.clear();
      if (!on) return write({ ...record(), off: true });
      for (const channel of Object.values(channels)) if (channel.token) quiet.add(channel.token);
      write({ seen: [], off: false });
    },
  };
}
