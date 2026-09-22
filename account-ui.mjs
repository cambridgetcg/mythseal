import { snapshotSummary } from './cloud-save.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = value => Number.isFinite(value) ? value.toLocaleString('zh-Hant') : '—';
const disabled = condition => condition ? ' disabled' : '';
const seal = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 3 43 14v20L24 45 5 34V14Z"/><path d="m24 10 12 7v14l-12 7-12-7V17Z"/><path d="M17 19h14M17 29h14M24 16v16M20 23h8"/></svg>';

function localSummary(profile) {
  return { cards: profile?.instances?.length || 0, coins: profile?.coins || 0, dust: profile?.dust || 0, xp: profile?.xp || 0, decks: profile?.deckSlots?.length || 0, played: profile?.stats?.played || 0, won: profile?.stats?.won || 0 };
}

function statsMarkup(summary) {
  return `<dl class="account-stats">${[['cards', '卡牌'], ['coins', '金幣'], ['dust', '靈砂'], ['xp', '旅途歷練'], ['decks', '牌組'], ['played', '完成對局']].map(([key, label]) => `<div><dt>${label}</dt><dd>${number(summary[key])}</dd></div>`).join('')}</dl>`;
}

function updatedLabel(value) {
  return new Intl.DateTimeFormat('zh-Hant', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function confirmationMarkup(state) {
  if (!state.confirmation) return '';
  const restore = state.confirmation.action === 'restore';
  return `<section class="account-confirmation" role="alertdialog" aria-labelledby="account-confirm-heading" aria-describedby="account-confirm-copy"><h3 id="account-confirm-heading">${restore ? '將此裝置恢復至雲端旅程？' : '刪除這份雲端備份？'}</h3><p id="account-confirm-copy">${restore ? '此裝置目前的進度會被取代。恢復前會先保留一份回復副本，請確認上方兩份旅程的內容。' : '雲端的這份旅程將被刪除。此裝置的卡牌與進度會保留，之後仍可重新備份。'}</p><div class="account-actions"><button type="button" class="account-action ${restore ? 'gold' : 'danger'}" data-action="account-${restore ? 'restore' : 'delete'}"${disabled(state.busy)}>${state.busy ? '處理中…' : restore ? '確認恢復旅程' : '確認刪除備份'}</button><button type="button" class="account-action" data-action="account-cancel-confirmation"${disabled(state.busy)}>保留現狀</button></div></section>`;
}

function authMarkup(state) {
  if (!state.initialized) {
    return `<div class="account-welcome"><span class="account-cloud-symbol" aria-hidden="true">◇</span><h2>${state.busy ? '正在開啟旅程閣' : '暫時未能開啟旅程閣'}</h2><p>此裝置的旅程仍然保留，你可以繼續遊歷。</p>${state.busy ? '' : '<button type="button" class="account-action gold" data-action="account-retry">重新連線</button>'}</div>`;
  }
  if (!state.emailEnabled) return '<div class="account-welcome"><span class="account-cloud-symbol" aria-hidden="true">◇</span><h2>登入暫未開放</h2><p>旅程閣準備好後，你便可在這裡備份收藏與歷練。現在仍可自在遊歷。</p></div>';
  if (state.codeSent) return `<div class="account-auth"><div class="eyebrow">A LETTER TO YOUR JOURNEY</div><h2>以一封信，續上旅程。</h2><p>六位數字驗證碼已寄往<br><strong>${safe(state.emailDraft)}</strong></p><form data-account-form="verify"><label for="account-token">電郵驗證碼</label><input id="account-token" name="token" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" placeholder="六位數字" value="${safe(state.tokenDraft)}" required${disabled(state.busy)}><button type="submit" class="primary"${disabled(state.busy)}>${state.busy === 'verify-code' ? '驗證中…' : '登入旅程閣'}</button></form><button type="button" class="account-text-button" data-action="account-change-email"${disabled(state.busy)}>更換電郵或重新取得驗證碼</button></div>`;
  return `<div class="account-auth"><div class="eyebrow">KEEP YOUR JOURNEY CLOSE</div><h2>收藏相逢，留住歷練。</h2><p>用電郵登入，將這段旅程留一份雲端備份。<br>毋須設定密碼。</p><form data-account-form="email"><label for="account-email">電郵地址</label><input id="account-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="you@example.com" value="${safe(state.emailDraft)}" required${disabled(state.busy)}><button type="submit" class="primary"${disabled(state.busy)}>${state.busy === 'request-code' ? '寄送中…' : '取得登入驗證碼'}</button></form><p class="account-fine-print">登入不會自動上傳、合併或取代任何旅程。</p></div>`;
}

function cloudMarkup(state, profile) {
  if (!state.account) return authMarkup(state);
  const pending = Boolean(profile?.pending);
  const cloudDisabled = Boolean(state.busy || !state.cloudLoaded || state.conflict);
  const writable = state.journeyVersion === 2, legacy = state.backup?.snapshot.version === 1;
  const compatibility = !writable ? '<p class="account-message">西行收藏的雲端備份尚未開放。此裝置照常保存；請使用「匯出旅程備份」保留副本。舊版雲端旅程仍可讀取及恢復。</p>' : legacy ? '<p class="account-message">這是保留的舊版旅程。你可以恢復它；備份此裝置會另存新版旅程，保留舊版副本。</p>' : '';
  return `<div class="account-card-heading"><div><span class="account-kicker">雲端旅程</span><h2>封存在此的相逢</h2></div><span class="account-pill">${state.backup ? '已有備份' : state.cloudLoaded ? '尚未備份' : '待讀取'}</span></div>${compatibility}${state.backup ? `${statsMarkup(snapshotSummary(state.backup.snapshot))}<p class="account-save-time">備份於 <time datetime="${safe(state.backup.updatedAt)}">${safe(updatedLabel(state.backup.updatedAt))}</time></p>` : `<div class="account-empty"><span aria-hidden="true">◇</span><h3>${state.cloudLoaded ? writable ? '第一頁，等你寫下。' : '尚無舊版雲端旅程。' : '正在尋找你的旅程。'}</h3><p>${state.cloudLoaded ? writable ? '選擇「備份此裝置」，便可保存目前的卡牌、牌組與歷練。' : '請先匯出此裝置的旅程備份，保留目前的卡牌與歷練。' : '重新讀取後，再選擇要保留的旅程。'}</p></div>`}<div class="account-actions"><button type="button" class="account-action gold" data-action="account-upload"${disabled(cloudDisabled || pending || !writable)}>${state.busy === 'upload' ? '備份中…' : '備份此裝置'}</button><button type="button" class="account-action" data-action="account-confirm-restore"${disabled(cloudDisabled || pending || !state.backup)}>恢復雲端旅程</button><button type="button" class="account-text-button" data-action="account-refresh"${disabled(state.busy)}>重新讀取</button></div>${state.backup ? `<p class="account-fine-print">${legacy ? '舊版副本會繼續保留。' : '再次備份會取代這裡的雲端旅程。'}${state.localChanged ? '此裝置與雲端的內容有所不同。' : '兩份旅程目前一致。'}</p><button type="button" class="account-text-button danger" data-action="account-confirm-delete"${disabled(cloudDisabled || !writable || legacy)}>刪除雲端備份</button>` : ''}${confirmationMarkup(state)}`;
}

export function accountButtonMarkup(state) {
  return `<button type="button" class="account-trigger${state.account ? ' is-signed-in' : ''}" data-action="account-open" aria-label="旅程閣${state.account ? '，已登入' : '，登入與雲端備份'}">${seal}<span>旅程閣</span>${state.account ? '<i aria-hidden="true"></i>' : ''}</button>`;
}

export function accountMarkup(state, localProfile) {
  const pending = Boolean(localProfile?.pending);
  return `<div class="account-shell" aria-busy="${Boolean(state.busy)}"><header class="account-heading"><div><div class="eyebrow">THE JOURNEY ARCHIVE</div><h1>旅程閣<span>一紙契約，萬象相隨。</span></h1><p>走過的路，遇見的同伴，都值得好好保存。</p></div><div class="account-seal" aria-hidden="true">${seal}</div></header>${state.account ? `<div class="account-identity"><span><span class="account-status-dot" aria-hidden="true"></span>已登入 <strong>${safe(state.account.email)}</strong></span><button type="button" class="account-text-button" data-action="account-logout"${disabled(state.busy === 'logout')}>${state.busy === 'logout' ? '登出中…' : '登出'}</button></div>` : ''}<div class="account-messages" aria-live="polite">${state.error ? `<p class="account-message is-error" role="alert">${safe(state.error)}</p>` : ''}${state.status ? `<p class="account-message" role="status">${safe(state.status)}</p>` : ''}${state.conflict ? '<p class="account-message is-conflict">雲端有另一份更新的旅程。請先按「重新讀取」，確認兩份內容後再作選擇。</p>' : ''}</div><div class="account-columns"><section class="account-panel local"><div class="account-card-heading"><div><span class="account-kicker">此裝置</span><h2>手中的這段旅程</h2></div><span class="account-pill">本機保存</span></div>${statsMarkup(localSummary(localProfile))}<div class="account-local-note"><span aria-hidden="true">◈</span><p>卡牌與進度保存在目前的瀏覽器。<br>換裝置前，記得手動備份這段旅程。</p></div>${pending ? '<p class="account-message is-conflict">對局尚未結束。完成或放棄對局後，便可備份或恢復旅程。</p>' : ''}</section><section class="account-panel cloud">${cloudMarkup(state, localProfile)}</section></div><p class="account-footer-note"><span aria-hidden="true">◇</span> 每次備份與恢復，都由你親自選擇。登入不會自動切換旅程。</p></div>`;
}
