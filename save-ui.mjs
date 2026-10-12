/** Markup for save safety (docs/LOCAL-COMMANDS.md §11): the 旅程閣 tools and backup status,
 * the lobby's restore offer and once-only backup prompts, and the import confirmation.
 * Markup only; app.mjs owns storage, the file picker and the restore. */
const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = value => Number.isFinite(value) ? value.toLocaleString('zh-Hant') : '—';
function stampLabel(value) {
  try { return new Intl.DateTimeFormat('zh-Hant', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  catch { return value; }
}

export const PERSISTENCE_LABELS = Object.freeze({
  none: '未曾要求（勝出一局或開匣後會要求）',
  requested: '已要求，等候瀏覽器回覆',
  unanswered: '未有回覆（瀏覽器未確認保留）',
  granted: '瀏覽器已答應保留',
  denied: '瀏覽器未答應（久未開啟時可能被清除）',
  unsupported: '此瀏覽器未提供',
  error: '未能確認',
});

/** '上次備份：未曾', or the date of this device's last export or cloud backup. */
export function saveStatusMarkup({ lastBackup = null, persistence = null } = {}) {
  const backup = lastBackup
    ? `<time datetime="${safe(lastBackup.at)}">${safe(stampLabel(lastBackup.at))}</time> · ${lastBackup.kind === 'cloud' ? '雲端備份' : '匯出檔案'}`
    : '未曾';
  const kept = PERSISTENCE_LABELS[persistence?.state ?? 'none'];
  return `<p class="save-status" data-save-status data-persistence="${safe(persistence?.state ?? 'none')}"><span data-last-backup>上次備份：${backup}</span><span data-persistence-label>長期保存：${safe(kept)}</span></p>`;
}

/** The 旅程閣 tools row: status, export, import and the rules. */
export function saveToolsMarkup(status) {
  return `<div class="game-utilities save-tools">${saveStatusMarkup(status)}<button class="text-button" data-action="export-save">匯出旅程備份 ↗</button><button class="text-button" data-action="import-save">匯入旅程備份 ↗</button><button class="text-button" data-action="rules">弈道 · 遊戲規則</button></div>`;
}

// The latest progress, not the journey: a signed-in player's cloud backup is made only on request.
const kept = '這段旅程的最新進度只保存在此瀏覽器；匯出一份備份，或在旅程閣備份到雲端。';
const notices = {
  'restore-offer': { text: '有舊旅程？由備份還原', label: '這是此裝置的新旅程。若你曾匯出旅程備份或備份到雲端，可以由這裡還原；雲端旅程會先在旅程閣確認登入。' },
  'first-win': { text: '首勝已記 · 留份備份？', label: `首勝已記下。${kept}` },
  'first-pack': { text: '新卡入藏 · 留份備份？', label: `新卡已入藏。${kept}` },
};
// The first win this device records may be a journey's sixth: claim 首勝 only for its first.
const laterWin = { text: '勝局已記 · 留份備份？', label: `勝局已記下。${kept}` };
const glyph = mark => `<span class="save-notice-glyph" aria-hidden="true"> ${mark}</span>`;

/** A small strip above the lobby; never a dialog. `wins` is the journey's win count, so a
 * first-win prompt says 首勝 only on its first win. `cloud: false` drops the restore offer's
 * cloud path, for a guest 旅程閣 knows cannot sign in now; otherwise 雲端旅程 leads into
 * 旅程閣, which looks the account up (the lobby does not). */
export function saveNoticeMarkup(kind, { cloud = true, wins = null } = {}) {
  const notice = kind === 'first-win' && wins !== 1 ? laterWin : notices[kind];
  if (!notice) return '';
  const actions = kind === 'restore-offer'
    ? `<button type="button" class="small-button" data-action="import-save">備份檔${glyph('↗')}</button>${cloud ? `<button type="button" class="small-button" data-action="restore-offer-cloud">雲端旅程${glyph('→')}</button>` : ''}`
    : '<button type="button" class="small-button" data-action="export-save">匯出備份</button><button type="button" class="small-button" data-action="account-open">旅程閣</button>';
  const label = kind === 'restore-offer' && !cloud ? '這是此裝置的新旅程。若你曾匯出旅程備份，可以由這裡還原。' : notice.label;
  return `<div class="resume-banner scene-resume-strip save-notice" data-save-notice="${kind}" role="region" aria-label="${safe(label)}"><span>${safe(notice.text)}</span><div>${actions}<button type="button" class="small-button save-notice-close" data-action="save-notice-dismiss" data-id="${kind}" aria-label="${kind === 'restore-offer' ? '不用還原，關閉提示' : '關閉提示，不會再出現'}">×</button></div></div>`;
}

const rows = [['cards', '卡牌'], ['coins', '金幣'], ['dust', '靈砂'], ['xp', '旅途歷練'], ['decks', '牌組'], ['played', '完成對局']];
function summaryMarkup(title, summary) {
  return `<section class="import-side"><h3>${title}</h3><dl>${rows.map(([key, label]) => `<div><dt>${label}</dt><dd data-summary="${key}">${number(summary[key])}</dd></div>`).join('')}</dl><p>旅程日期 ${safe(summary.date)}${summary.vault ? ` · 商旅保管 ${number(summary.vault)} 張` : ''}</p></section>`;
}

/** What an import replaces, before anything is written. `recovery` is the recovery copy
 * this device keeps now ({ savedAt }), if any: there is one slot, so the import replaces it. */
export function importConfirmMarkup({ current, backup, fileName = '', recovery = null }) {
  const replaced = recovery
    ? `<p class="panel-footnote" data-recovery-replaced>旅程閣現有的回復備份${recovery.savedAt ? `（${safe(stampLabel(recovery.savedAt))}）` : ''}會被這次取代；如需保留，請先在旅程閣「下載本機回復備份」。</p>`
    : '';
  // One block, so a phone's dialog page shows the comparison and the recovery note together.
  return `<div class="eyebrow">RESTORE FROM A BACKUP</div><h2>由備份檔還原旅程？</h2><div class="import-review"><p class="import-file">${safe(fileName)}</p><div class="import-compare">${summaryMarkup('此裝置現在（將被取代）', current)}${summaryMarkup('備份檔（將還原）', backup)}</div><p class="panel-footnote">還原前，此裝置現在的旅程會先留作回復備份，可在旅程閣「復原上次本機旅程」取回。雲端備份不會改變。</p>${replaced}</div><div class="modal-actions"><button class="secondary" data-action="close-modal">保留現在進度</button><button class="primary" data-action="import-confirm">由備份還原</button></div>`;
}
