/** Campaign/activity save contract. Pure validation; never grants or repairs rewards. */
import { validateDeck } from './engine.mjs';
import { getPrintForCard, WX01_PRINTINGS } from './printing-catalogue.mjs';
import { CAMPAIGN_NODES, CAMPAIGN_TITLE as CAMPAIGN_TITLE_CONTENT } from './campaign-content.mjs';
import { FIRE_MOUNTAIN } from './activity-content.mjs';

export const MAX_EXPANSION_GRANTS = 256;
export const EXPANSION_LIMIT = 1_000_000_000;
export const CAMPAIGN_TITLE = CAMPAIGN_TITLE_CONTENT.name;
export const ACTIVITY_TITLE = '借得東風';
const fail = () => { throw new RangeError('續卷與活動記錄不完整，未有更改存檔。'); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => { if (!object(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) fail(); };
const counter = (value, maximum = EXPANSION_LIMIT) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const arrayUnique = value => Array.isArray(value) && new Set(value).size === value.length;
const same = (a, b) => {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => same(value, b[index]));
  return object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && same(a[key], b[key]));
};
const uint32 = value => counter(value, 0xffffffff);
export function expansionWeekKey(now = new Date()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new RangeError('日期無效。');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(part => [part.type, part.value]));
  const monday = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return monday.toISOString().slice(0, 10);
}
const validWeek = week => typeof week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(Date.parse(`${week}T12:00:00Z`)) && expansionWeekKey(`${week}T12:00:00Z`) === week;
const validISO = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export const basePrintFor = cardId => WX01_PRINTINGS.find(print => print.cardId === cardId && print.treatment === 'base')?.id ?? null;
export function createExpansionState(now = new Date()) {
  return { version: 1, tickets: 0, serial: 0, mastery: {}, grants: [], titles: [], fireMountain: { clears: 0, dry: 0, firstClear: false, weekly: { week: expansionWeekKey(now), clears: 0, claimed: [] }, run: null, lastResult: null } };
}
export function seededBattleRNG(seed) {
  if (!uint32(seed)) fail();
  let value = seed;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 0x100000000; };
}
function validateRoster(value, profile) {
  if (!['owned', 'loaner'].includes(value.route) || !validateDeck(value.deck).valid || !Array.isArray(value.instanceIds)) fail();
  exact(value.cardPrints, value.deck); exact(value.cardInstances, value.route === 'owned' ? value.deck : []);
  for (const id of value.deck) { if (typeof value.cardPrints[id] !== 'string') fail(); getPrintForCard(id, value.cardPrints[id]); }
  if (value.route === 'loaner') {
    if (value.instanceIds.length || value.deck.some(id => getPrintForCard(id, value.cardPrints[id]).treatment !== 'base')) fail();
  } else {
    if (!arrayUnique(value.instanceIds) || value.instanceIds.length !== 8) fail();
    const owned = new Map((profile.instances ?? []).map(instance => [instance.uid, instance]));
    for (const [index, id] of value.deck.entries()) {
      const instance = owned.get(value.instanceIds[index]);
      if (!instance || instance.cardId !== id || value.cardInstances[id] !== instance.uid || instance.printId !== value.cardPrints[id]) fail();
    }
  }
}
export function validateExpansionPending(pending, profile) {
  const activity = pending?.kind === 'activity', node = CAMPAIGN_NODES.find(node => node.id === pending?.nodeId);
  if (!activity && !node) return structuredClone(pending);
  exact(pending, ['id', 'kind', 'nodeId', 'instanceIds', 'cardInstances', 'cardPrints', 'route', 'battleSeed', 'playerDeck', 'opponentDeck', ...(activity ? ['activityRunId', 'activityStage', 'initialResources'] : [])]);
  if (pending.id !== `battle-${profile.serial}` || profile.serial < 1 || !uint32(pending.battleSeed) || !validateDeck(pending.opponentDeck).valid) fail();
  validateRoster({ ...pending, deck: pending.playerDeck }, profile);
  if (activity) {
    exact(pending.initialResources, ['hp', 'pills']);
    if (pending.nodeId !== null || !counter(pending.activityStage, 2) || !/^activity-[1-9]\d*$/.test(pending.activityRunId)
      || !counter(pending.initialResources.hp, 12) || pending.initialResources.hp < 1 || !counter(pending.initialResources.pills, 12)
      || !same(pending.opponentDeck, FIRE_MOUNTAIN.stages[pending.activityStage].opponentDeck)) fail();
    if (pending.route === 'loaner' && !same(pending.playerDeck, FIRE_MOUNTAIN.loanerDeck)) fail();
  } else if (pending.kind !== 'expedition' || !same(pending.opponentDeck, node.opponentDeck)
    || pending.route === 'loaner' && !same(pending.playerDeck, node.loanerDeck)) fail();
  return structuredClone(pending);
}
export function validateExpansionState(raw, profile) {
  exact(raw, ['version', 'tickets', 'serial', 'mastery', 'grants', 'titles', 'fireMountain']);
  if (raw.version !== 1 || !counter(raw.tickets) || !counter(raw.serial) || !object(raw.mastery)) fail();
  const known = new Map(CAMPAIGN_NODES.map(node => [node.id, node]));
  for (const [id, marks] of Object.entries(raw.mastery)) {
    exact(marks, ['win', 'life', 'pills']);
    if (!known.has(id) || !profile.cleared.includes(id) || marks.win !== true || typeof marks.life !== 'boolean' || typeof marks.pills !== 'boolean') fail();
  }
  if (!Array.isArray(raw.grants) || raw.grants.length > MAX_EXPANSION_GRANTS || new Set(raw.grants.map(grant => grant.id)).size !== raw.grants.length) fail();
  for (const grant of raw.grants) {
    exact(grant, ['id', 'kind', 'printId', 'source']);
    if (typeof grant.id !== 'string' || typeof grant.source !== 'string' || !['base', 'aa'].includes(grant.kind)) fail();
    if (grant.kind === 'aa') {
      if (grant.id !== 'campaign:westward-echo:aa' || grant.source !== 'westward-echo' || grant.printId !== null || !CAMPAIGN_NODES.every(node => profile.cleared.includes(node.id))) fail();
    } else {
      const print = WX01_PRINTINGS.find(print => print.id === grant.printId && print.treatment === 'base');
      if (!print) fail();
      const node = known.get(grant.source);
      if (node) {
        if (!node.rewardCharacter || print.cardId !== node.rewardCharacter || grant.id !== `campaign:${node.id}:base` || !profile.cleared.includes(node.id)) fail();
      } else if (grant.source !== 'fire-mountain') fail();
      else if (grant.id === 'fire-mountain:first-clear') {
        if (print.cardId !== 'niumowang' || raw.fireMountain?.clears < 1) fail();
      } else {
        const match = /^activity-([1-9]\d*):stage-([0-2]):loot$/.exec(grant.id);
        if (!match || Number(match[1]) > raw.serial || FIRE_MOUNTAIN.stages[Number(match[2])].dropPrintId !== grant.printId) fail();
      }
    }
  }
  if (!arrayUnique(raw.titles) || raw.titles.some(title => ![CAMPAIGN_TITLE, ACTIVITY_TITLE].includes(title))) fail();
  const family = raw.fireMountain;
  exact(family, ['clears', 'dry', 'firstClear', 'weekly', 'run', 'lastResult']);
  if (!counter(family.clears) || !counter(family.dry, 19) || family.firstClear !== (family.clears > 0)) fail();
  if (raw.titles.includes(CAMPAIGN_TITLE) !== CAMPAIGN_NODES.every(node => profile.cleared.includes(node.id)) || raw.titles.includes(ACTIVITY_TITLE) !== (family.clears >= 5)) fail();
  exact(family.weekly, ['week', 'clears', 'claimed']);
  if (!validWeek(family.weekly.week) || !counter(family.weekly.clears) || family.weekly.clears > family.clears
    || !same(family.weekly.claimed, [1, 3].filter(target => family.weekly.clears >= target))) fail();
  if (family.lastResult !== null) {
    const result = family.lastResult; exact(result, ['runId', 'stage', 'winner', 'loot', 'hp', 'pills']);
    if (!/^activity-[1-9]\d*$/.test(result.runId) || Number(result.runId.slice(9)) > raw.serial || !counter(result.stage, 2)
      || !['player', 'opponent', 'draw'].includes(result.winner) || !counter(result.hp, 12) || !counter(result.pills, 12)) fail();
    if (result.loot !== null) {
      exact(result.loot, ['kind', 'printId', 'forced']);
      if (result.winner !== 'player' || !['dust', 'coins', 'base'].includes(result.loot.kind) || typeof result.loot.forced !== 'boolean'
        || result.loot.printId !== (result.loot.kind === 'base' ? FIRE_MOUNTAIN.stages[result.stage].dropPrintId : null)
        || result.loot.forced && result.loot.kind !== 'base') fail();
    } else if (result.winner === 'player') fail();
  }
  if (family.run !== null) {
    const run = family.run;
    exact(run, ['id', 'activityId', 'version', 'route', 'startWeek', 'startedAt', 'stage', 'phase', 'deck', 'instanceIds', 'cardInstances', 'cardPrints', 'seeds', 'hp', 'pills', 'settled', 'supplies', 'banked']);
    if (run.id !== `activity-${raw.serial}` || raw.serial < 1 || run.activityId !== FIRE_MOUNTAIN.id || run.version !== FIRE_MOUNTAIN.version
      || !validWeek(run.startWeek) || run.startWeek !== family.weekly.week || !validISO(run.startedAt) || !counter(run.stage, 2)
      || !['battle', 'supply'].includes(run.phase) || !counter(run.hp, 12) || run.hp < 1 || !counter(run.pills, 12)
      || run.phase === 'supply' && run.stage === 2) fail();
    validateRoster(run, profile);
    if (run.route === 'loaner' && !same(run.deck, FIRE_MOUNTAIN.loanerDeck)) fail();
    if (!Array.isArray(run.seeds) || run.seeds.length !== 3) fail();
    for (const seed of run.seeds) { exact(seed, ['battle', 'loot']); if (!uint32(seed.battle) || !uint32(seed.loot)) fail(); }
    const completed = run.stage + (run.phase === 'supply' ? 1 : 0);
    if (!same(run.settled, Array.from({ length: completed }, (_, index) => index)) || !Array.isArray(run.supplies) || run.supplies.length !== run.stage
      || run.supplies.some(value => !['life', 'pills', 'none'].includes(value))) fail();
    exact(run.banked, ['coins', 'dust', 'xp']);
    if (!Object.values(run.banked).every(value => counter(value))) fail();
    if (run.banked.coins < completed * 60 || run.banked.coins > completed * 90 || run.banked.dust < completed * 3 || run.banked.dust > completed * 5 || run.banked.xp !== completed * 30) fail();
    if (completed) {
      const last = family.lastResult;
      if (!last || last.runId !== run.id || last.stage !== completed - 1 || last.winner !== 'player') fail();
      let hp = Math.min(12, last.hp + 2), pills = Math.max(8, last.pills);
      if (run.phase === 'battle') {
        const supply = run.supplies.at(-1);
        if (supply === 'life') { if (hp === 12) fail(); hp = Math.min(12, hp + 4); }
        else if (supply === 'pills') { if (pills === 12) fail(); pills = Math.min(12, pills + 4); }
        else if (hp !== 12 || pills !== 12) fail();
      }
      if (run.hp !== hp || run.pills !== pills) fail();
    } else if (run.hp !== 12 || run.pills !== 12) fail();
    if (run.phase === 'supply') { if (profile.pending !== null) fail(); }
    else {
      const pending = validateExpansionPending(profile.pending, profile);
      if (!pending || pending.kind !== 'activity' || pending.activityRunId !== run.id || pending.activityStage !== run.stage
        || pending.route !== run.route || pending.battleSeed !== run.seeds[run.stage].battle
        || !same(pending.playerDeck, run.deck) || !same(pending.instanceIds, run.instanceIds)
        || !same(pending.cardInstances, run.cardInstances) || !same(pending.cardPrints, run.cardPrints)
        || pending.initialResources.hp !== run.hp || pending.initialResources.pills !== run.pills) fail();
    }
  } else if (profile.pending?.kind === 'activity') fail();
  return structuredClone(raw);
}
export function rollExpansionWeek(expansion, now) {
  const next = structuredClone(expansion), week = expansionWeekKey(now);
  if (!next.fireMountain.run && week > next.fireMountain.weekly.week) next.fireMountain.weekly = { week, clears: 0, claimed: [] };
  return next;
}
