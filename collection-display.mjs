/** Display-only selectors. Exact copies remain separate; no save or deck choices. */
import { getCard } from './engine.mjs';
import { getPrintForCard } from './printing-catalogue.mjs';
import { printLabel } from './card-presentation.mjs';

const treatmentPriority = { base: 0, aa: 1, leader: 2, treasure: 3, ink: 4 };
const uidOrder = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const printOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function acquiredTime(instance) {
  const time = new Date(instance.acquiredAt).getTime();
  return Number.isFinite(time) ? time : 0;
}
function countsByCard(instances) {
  const counts = new Map();
  for (const instance of instances) counts.set(instance.cardId, (counts.get(instance.cardId) || 0) + 1);
  return counts;
}
function filteredInstances(profile, view, counts) {
  const query = (view.query || '').trim().toLocaleLowerCase('zh-Hant');
  return profile.instances.filter(instance => {
    const card = getCard(instance.cardId);
    return (!query || `${card.name} ${card.title} ${instance.uid} ${printLabel(card, { printId: instance.printId })}`.toLocaleLowerCase('zh-Hant').includes(query))
      && (view.faction === 'all' || !view.faction || card.faction === view.faction)
      && (view.filter !== 'locked' || instance.locked)
      && (view.filter !== 'duplicates' || counts.get(instance.cardId) > 1);
  }).sort((a, b) => {
    if (view.sort === 'name') return getCard(a.cardId).name.localeCompare(getCard(b.cardId).name, 'zh-Hant') || uidOrder(a.uid, b.uid);
    if (view.sort === 'level') return b.level - a.level || b.xp - a.xp || acquiredTime(b) - acquiredTime(a) || uidOrder(a.uid, b.uid);
    return acquiredTime(b) - acquiredTime(a) || uidOrder(b.uid, a.uid);
  });
}

/** New result array; instance records are read-only references to owned copies. */
export function getFilteredInstances(profile, view = {}) {
  return filteredInstances(profile, view, countsByCard(profile.instances));
}

function coverPriority(instance) {
  return treatmentPriority[getPrintForCard(instance.cardId, instance.printId).treatment];
}
function compareCovers(a, b) {
  return coverPriority(b) - coverPriority(a) || b.xp - a.xp || uidOrder(b.uid, a.uid);
}

/**
 * Group order follows the first matching copy. Cover and instances use matches;
 * totals, level range, protections and printing counts describe all owned copies.
 * A cover is cosmetic and must never replace an explicitly chosen battle UID.
 */
export function getCardGroups(profile, view = {}) {
  const summaries = new Map(), deckUids = new Set((profile.deckSlots || []).flatMap(slot => slot.instanceIds));
  for (const instance of profile.instances) {
    let summary = summaries.get(instance.cardId);
    if (!summary) {
      summary = { totalCount: 0, prints: new Map(), minLevel: instance.level, maxLevel: instance.level, lockedCount: 0, deckCount: 0 };
      summaries.set(instance.cardId, summary);
    }
    summary.totalCount++;
    summary.minLevel = Math.min(summary.minLevel, instance.level);
    summary.maxLevel = Math.max(summary.maxLevel, instance.level);
    if (instance.locked) summary.lockedCount++;
    if (deckUids.has(instance.uid)) summary.deckCount++;
    if (!summary.prints.has(instance.printId)) summary.prints.set(instance.printId, { printId: instance.printId, count: 0, matchingCount: 0 });
    summary.prints.get(instance.printId).count++;
  }
  const counts = new Map([...summaries].map(([id, summary]) => [id, summary.totalCount]));
  const groups = new Map();
  for (const instance of filteredInstances(profile, view, counts)) {
    let group = groups.get(instance.cardId);
    if (!group) {
      const summary = summaries.get(instance.cardId);
      group = { cardId: instance.cardId, card: getCard(instance.cardId), instances: [], cover: instance,
        totalCount: summary.totalCount, matchingCount: 0, prints: [...summary.prints.values()],
        minLevel: summary.minLevel, maxLevel: summary.maxLevel, lockedCount: summary.lockedCount, deckCount: summary.deckCount };
      group.prints.sort((a, b) => treatmentPriority[getPrintForCard(group.cardId, b.printId).treatment]
        - treatmentPriority[getPrintForCard(group.cardId, a.printId).treatment] || printOrder(a.printId, b.printId));
      groups.set(instance.cardId, group);
    }
    group.instances.push(instance); group.matchingCount++;
    summaries.get(instance.cardId).prints.get(instance.printId).matchingCount++;
    if (compareCovers(instance, group.cover) < 0) group.cover = instance;
  }
  return [...groups.values()];
}

/** Current owned or buyback-vault evidence only; this never persists an unlock. */
export function isCharacterCollected(profile, cardId) {
  return profile.instances.some(instance => instance.cardId === cardId)
    || (profile.merchantVault || []).some(entry => entry.instance.cardId === cardId);
}
