/** Keep a failed/unsupported local journey visible and recoverable, never reset it. */
try {
  await import('./app.mjs');
} catch (error) {
  const app = document.querySelector('#app');
  if (app) {
    const main = document.createElement('main');
    main.className = 'startup-recovery';
    const heading = document.createElement('h1'); heading.textContent = '旅程暫時未能開啟';
    const note = document.createElement('p'); note.textContent = '原有進度仍保留。請先匯出存檔，或重新載入頁面再試。';
    const detail = document.createElement('p'); detail.textContent = error instanceof Error ? error.message : '頁面未能完整載入。';
    const reload = document.createElement('button'); reload.className = 'primary'; reload.textContent = '重新載入'; reload.onclick = () => location.reload();
    const backup = document.createElement('button'); backup.className = 'secondary'; backup.textContent = '匯出保留的存檔';
    backup.onclick = () => {
      try {
        const keys = ['shanhai.profile.v4', 'shanhai.battle.v4', 'shanhai.profile.v3', 'shanhai.battle.v3', 'shanhai.profile.v2', 'shanhai.battle.v2', 'shanhai.deck.v1', 'shanhai.stats.v1', 'shanhai.profile.recovery.v4', 'shanhai.profile.recovery.v3', 'shanhai.profile.recovery.v2'];
        const data = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]).filter(([, text]) => text !== null));
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'mythseal-recovery-originals.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch { detail.textContent = '瀏覽器未允許讀取存檔。請開啟網站儲存權限，再重新載入；不要清除網站資料。'; }
    };
    main.append(heading, note, detail, backup, reload); app.replaceChildren(main);
  }
}
