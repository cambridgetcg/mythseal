/** T1 first-visit teaching (docs/TUTORIAL-T1.md). Pure: no DOM, no randomness, no profile
 * writes and no storage of its own. */

/** The first expedition, where D3's first-battle coach runs (battle-teaching.mjs FIRST_NODE). */
export const FIRST_EXPEDITION = 'mist-gate';
/** The lobby's first visit (navigation-ui.mjs lobbyMarkup): no battle finished, none in progress. */
export const isFirstVisit = profile => profile?.stats?.played === 0 && !profile?.pending;
/** Where the rules dialog's 知其道，入其局 leads (docs/TUTORIAL-T1.md §1): on a first visit the
 * 霧隱渡口 preparation, so a player who reads the rules first still meets D3's coach;
 * otherwise 自由切磋, as before. Decided at tap time from the profile alone. */
export function rulesStartRoute(profile) {
  return Object.freeze(isFirstVisit(profile)
    ? { kind: 'expedition', nodeId: FIRST_EXPEDITION }
    : { kind: 'practice', nodeId: null });
}
