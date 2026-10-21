/**
 * O1 · the gentle first guardian (docs/GENTLE-GUARDIAN-O1.md). In the player's first battle,
 * when it is the 霧隱渡口 expedition, 守渡弈者 plays the disclosed style 緩渡: each commitment
 * (pills, plus Fury's cost) is at most `spendCap`, in every round. Pure: no DOM, storage or
 * randomness. The app decides the style once, when a battle starts, and keeps it in the battle
 * snapshot, so the style and its disclosure hold until that battle's result is shown.
 */
export const GENTLE_GUARDIAN = Object.freeze({ id: 'gentle-crossing', name: '緩渡', nodeId: 'mist-gate', spendCap: 2 });

/** The style for a battle about to start, or null. D3's coach condition (battle-teaching.mjs
 * coachStart) read from the save alone, without the device-local coach record, so a save plays
 * the same guardian on every device and skipping the coach marks does not change him. A save
 * that has cleared his ferry has finished a battle even when its `played` count was lost (an
 * old, imported or recovered save hydrates missing stats as 0), so `cleared` rules it out too. */
export function guardianStyle({ encounter = null, played = 0, cleared = [] } = {}) {
  return encounter?.kind === 'expedition' && encounter.nodeId === GENTLE_GUARDIAN.nodeId && played === 0
    && !cleared.includes(GENTLE_GUARDIAN.nodeId) ? GENTLE_GUARDIAN : null;
}

/** The style a battle snapshot names; a snapshot without one (or from before O1) plays today's AI. */
export const styleById = id => (id === GENTLE_GUARDIAN.id ? GENTLE_GUARDIAN : null);

/** chooseAIMove's options for a style: none for every battle outside 緩渡. */
export const aiOptions = style => (style ? { spendCap: style.spendCap } : {});
