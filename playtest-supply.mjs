/** Local preview only. A deliberate, once-per-journey owner playtest gift. */
import { assertLocalProfile } from './profile-store.mjs';

export const PLAYTEST_GIFT = 'wx01-box-20260922';
export const PLAYTEST_COINS = 10_000;
export const isLoopback = hostname => ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname);

export function claimPlaytestSupply(profile, { hostname } = {}) {
  if (!isLoopback(hostname)) throw Error('試玩補給只供本機開發旅程。');
  assertLocalProfile(profile);
  const next = structuredClone(profile);
  if (next.wx01.playtestGift === PLAYTEST_GIFT) return next;
  if (!Number.isSafeInteger(next.coins) || next.coins < 0 || next.coins > 1_000_000_000 - PLAYTEST_COINS) throw Error('金幣容量不足，未有更改旅程。');
  next.coins += PLAYTEST_COINS;
  next.wx01.playtestGift = PLAYTEST_GIFT;
  // The coins and claim marker are committed in the same profile write.
  return assertLocalProfile(next);
}
