/** Reveals one accepted receipt. No RNG, grants, storage, account or network access. */
import { getCard } from './engine.mjs';
import { cardPresentation, PRINT_TREATMENTS } from './card-presentation.mjs';

export function createPackOpeningController({ element, receipt, reducedMotion = () => false, pace = () => 'normal', announce = () => {}, window = globalThis.window, document = globalThis.document } = {}) {
  const box = receipt?.kind === 'box';
  const validBox = box && Array.isArray(receipt.packs) && [12, 24].includes(receipt.packs.length) && receipt.cards?.length === receipt.packs.length * 3
    && receipt.packs.every((pack, packIndex) => Array.isArray(pack?.cards) && pack.cards.length === 3 && pack.cards.every((card, index) => {
      const flat = receipt.cards[packIndex * 3 + index];
      return card && flat?.instanceId === card.instanceId && flat?.cardId === card.cardId && flat?.printId === card.printId;
    }));
  if (!element || element.dataset.receiptId !== receipt?.id || !Array.isArray(receipt.cards) || (box ? !validBox : ![1, 3].includes(receipt.cards.length))) throw new TypeError('開匣畫面需要已儲存的相符收據。');
  const count = receipt.cards.length, packCount = box ? receipt.packs.length : 1;
  const descriptions = receipt.cards.map(entry => {
    const print = cardPresentation(getCard(entry.cardId), { printId: entry.printId });
    return `${print.name}，${PRINT_TREATMENTS[print.treatment].name}，卡牌編號 ${entry.instanceId}`;
  });
  const schedule = window.setTimeout.bind(window), cancel = window.clearTimeout.bind(window);
  const timers = new Set(), revealed = new Set();
  let phase = 'sealed', destroyed = false, hiddenPage = false, packIndex = 0;
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const query = selector => element.querySelector(selector);
  const button = action => query(`[data-action="${action}"]`);
  const hidden = () => hiddenPage || document.hidden === true;
  const isStill = () => reducedMotion() || media?.matches === true || pace() === 'fast' || hidden();
  const focusInside = () => element.contains(document.activeElement);
  function clearTimers() { for (const timer of timers) cancel(timer); timers.clear(); }
  function later(callback, delay) {
    const timer = schedule(() => { timers.delete(timer); if (!destroyed && element.isConnected !== false) callback(); }, delay);
    timers.add(timer);
  }
  function setVisible(node, visible) { if (node) { node.hidden = !visible; if (node.tagName === 'BUTTON') node.disabled = !visible; } }
  function status(value) { const node = query('[data-pack-status]'); if (node) node.textContent = value; }
  function paint() {
    element.dataset.phase = phase;
    if (box) element.dataset.packIndex = String(packIndex);
    setVisible(query('[data-pack-scene]'), phase === 'sealed' || phase === 'opening');
    setVisible(query('[data-pack-cards]'), phase === 'ready' || phase === 'pack-complete' || !box && phase === 'complete');
    if (box) {
      setVisible(query('[data-box-overview]'), phase === 'complete');
      const progress = query('[data-box-progress]');
      setVisible(progress, phase !== 'complete');
      if (progress) progress.textContent = `第 ${packIndex + 1} / ${packCount} 匣`;
      for (let index = 0; index < packCount; index++) setVisible(query(`[data-box-panel="${index}"]`), index === packIndex && phase !== 'complete');
      const next = button('box-next');
      setVisible(next, phase === 'pack-complete');
      if (next) next.textContent = packIndex === packCount - 1 ? '查看整盒收藏 →' : `繼續第 ${packIndex + 2} 匣 →`;
    }
    const openButton = button('pack-open'); if (openButton) openButton.disabled = phase !== 'sealed';
    setVisible(button('pack-skip'), phase !== 'complete');
    setVisible(button('pack-show-all'), phase === 'ready');
    setVisible(button('pack-ack'), phase === 'complete');
    for (let index = 0; index < count; index++) {
      const slot = query(`[data-pack-slot="${index}"]`), active = !box || Math.floor(index / 3) === packIndex && phase !== 'complete', shown = revealed.has(index);
      if (!slot) continue;
      slot.classList.toggle('is-revealed', shown);
      setVisible(slot.querySelector('[data-pack-face]'), active && shown);
      setVisible(slot.querySelector('[data-pack-label]'), active && shown);
      setVisible(slot.querySelector('[data-action="pack-card-reveal"]'), active && !shown);
    }
    const packRevealed = box ? [0, 1, 2].filter(index => revealed.has(packIndex * 3 + index)).length : revealed.size;
    status(phase === 'sealed' ? '按封印，揭曉這份相逢。' : phase === 'opening' ? '封印漸開，旅人將至。' : phase === 'ready' ? `已揭曉 ${packRevealed} / ${box ? 3 : count} 張 · 按卡背逐張相見` : phase === 'pack-complete' ? `第 ${packIndex + 1} 匣已揭曉${receipt.packs[packIndex].mode === 'god' ? ' · 神契匣，三相同輝' : ''}。` : `${box ? `${packCount} 匣、` : ''}${count} 張戰卡已入藏${receipt.mode === 'god' ? ' · 神契匣，三相同輝' : ''}。`);
  }
  function focusNext() {
    const target = [...element.querySelectorAll('[data-action="pack-card-reveal"]')].find(node => !node.hidden && !node.disabled) || (box && phase === 'pack-complete' ? button('box-next') : button('pack-ack'));
    target?.focus({ preventScroll: true });
  }
  function finish({ focus = false } = {}) {
    if (destroyed) return;
    const moveFocus = focus || focusInside();
    clearTimers(); phase = 'complete';
    for (let index = 0; index < count; index++) revealed.add(index);
    for (const slot of element.querySelectorAll('[data-pack-slot]')) slot.classList.remove('just-revealed');
    paint();
    if (moveFocus && !hidden()) button('pack-ack')?.focus({ preventScroll: true });
  }
  function open() {
    if (destroyed || phase !== 'sealed') return;
    if (isStill()) return finish({ focus: true });
    phase = 'opening'; paint(); button('pack-skip')?.focus({ preventScroll: true });
    later(() => { if (hidden() || isStill()) finish(); else element.dataset.phase = 'unsealed'; }, 160);
    later(() => {
      if (hidden() || isStill()) return finish();
      phase = 'ready'; paint(); focusNext();
    }, 300);
  }
  function reveal(index) {
    if (destroyed || phase !== 'ready' || !Number.isInteger(index) || index < 0 || index >= count || revealed.has(index)) return;
    if (box && Math.floor(index / 3) !== packIndex) return;
    if (isStill()) return finish({ focus: true });
    revealed.add(index);
    for (const slot of element.querySelectorAll('[data-pack-slot]')) slot.classList.remove('just-revealed');
    query(`[data-pack-slot="${index}"]`)?.classList.add('just-revealed');
    if (box ? [0, 1, 2].every(offset => revealed.has(packIndex * 3 + offset)) : revealed.size === count) phase = box ? 'pack-complete' : 'complete';
    paint(); announce(`${box ? `第 ${packIndex + 1} 匣第 ${index % 3 + 1} 張` : `第 ${index + 1} 張`}：${descriptions[index]}。已入藏。`); focusNext();
  }
  function nextPack() {
    if (destroyed || !box || phase !== 'pack-complete') return;
    if (packIndex === packCount - 1 || isStill()) return finish({ focus: true });
    clearTimers(); packIndex++; phase = 'sealed'; paint(); open();
  }
  function syncPreferences() { if (!destroyed && phase !== 'complete' && isStill()) finish(); }
  function visibilityChanged() { if (hidden() && phase !== 'complete') finish(); }
  function pageHide() { hiddenPage = true; visibilityChanged(); }
  function pageShow() { hiddenPage = false; }
  document.addEventListener?.('visibilitychange', visibilityChanged);
  window.addEventListener?.('pagehide', pageHide);
  window.addEventListener?.('pageshow', pageShow);
  if (media?.addEventListener) media.addEventListener('change', syncPreferences);
  else media?.addListener?.(syncPreferences);
  function destroy() {
    if (destroyed) return;
    destroyed = true; clearTimers();
    document.removeEventListener?.('visibilitychange', visibilityChanged);
    window.removeEventListener?.('pagehide', pageHide);
    window.removeEventListener?.('pageshow', pageShow);
    if (media?.removeEventListener) media.removeEventListener('change', syncPreferences);
    else media?.removeListener?.(syncPreferences);
  }
  paint();
  return Object.freeze({ open, reveal, nextPack, finish, syncPreferences, destroy, getState: () => ({ receiptId: receipt.id, phase, revealed: [...revealed], packIndex, packCount, destroyed }) });
}
