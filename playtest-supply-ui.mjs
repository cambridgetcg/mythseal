import { createProfileStore, PROFILE_LOCK } from './profile-store.mjs';
import { PROFILE_KEY } from './progression.mjs';
import { claimPlaytestSupply, PLAYTEST_GIFT, PLAYTEST_COINS, isLoopback } from './playtest-supply.mjs';

const status = document.querySelector('#supply-status');
const balance = document.querySelector('#supply-balance');
const button = document.querySelector('#claim-supply');
let busy = false;
function ready() {
  if (!isLoopback(location.hostname)) throw Error('試玩補給只供本機開發旅程。');
  if (!navigator.locks) throw Error('請在支援安全儲存的新版瀏覽器領取。');
  // A supply page must never create a fresh journey to replace the player's save.
  if (![PROFILE_KEY, 'shanhai.profile.v4', 'shanhai.profile.v3', 'shanhai.profile.v2'].some(key => localStorage.getItem(key) !== null)) throw Error('請先在此瀏覽器開啟原本的遊戲旅程，再回來領取。');
  return createProfileStore({ storage: localStorage });
}
function render(profile) {
  balance.textContent = `${profile.coins.toLocaleString('zh-Hant')} 金幣`;
  const claimed = profile.wx01.playtestGift === PLAYTEST_GIFT;
  button.disabled = claimed || busy;
  button.textContent = claimed ? '補給已領取 ✓' : `領取 ${PLAYTEST_COINS.toLocaleString('zh-Hant')} 金幣`;
  status.textContent = claimed ? '西行補給已收入這份旅程。可返回市集開盒。' : '每份旅程可領一次；領取後保留現有卡牌、修練與保底進度。';
}
function refresh() {
  try { render(ready().load()); }
  catch (error) { button.disabled = true; status.textContent = error.message; }
}
button.addEventListener('click', async () => {
  if (busy) return;
  busy = true; button.disabled = true;
  try {
    const next = await navigator.locks.request(PROFILE_LOCK, () => {
      const store = ready();
      return store.save(claimPlaytestSupply(store.load(), { hostname: location.hostname }));
    });
    busy = false; render(next);
  } catch (error) { busy = false; button.disabled = false; status.textContent = error.message || '未能儲存，補給尚未入帳。'; }
});
window.addEventListener('storage', refresh);
refresh();
