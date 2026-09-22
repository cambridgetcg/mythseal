/** Reveals one accepted receipt. No RNG, grants, storage, account or network access. */
import { getCard } from './engine.mjs';
import { cardPresentation, PRINT_TREATMENTS } from './card-presentation.mjs';

export function createPackOpeningController({ element, receipt, reducedMotion = () => false, pace = () => 'normal', announce = () => {}, window = globalThis.window, document = globalThis.document } = {}) {
  if (!element || element.dataset.receiptId !== receipt?.id || !Array.isArray(receipt.cards) || ![1, 3].includes(receipt.cards.length)) throw new TypeError('開匣畫面需要已儲存的相符收據。');
  const count = receipt.cards.length;
  const descriptions = receipt.cards.map(entry => {
    const print = cardPresentation(getCard(entry.cardId), { printId: entry.printId });
    return `${print.name}，${PRINT_TREATMENTS[print.treatment].name}，卡牌編號 ${entry.instanceId}`;
  });
  const schedule = window.setTimeout.bind(window), cancel = window.clearTimeout.bind(window);
  const timers = new Set(), revealed = new Set();
  let phase = 'sealed', destroyed = false, hiddenPage = false;
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
    setVisible(query('[data-pack-scene]'), phase === 'sealed' || phase === 'opening');
    setVisible(query('[data-pack-cards]'), phase === 'ready' || phase === 'complete');
    const openButton = button('pack-open'); if (openButton) openButton.disabled = phase !== 'sealed';
    setVisible(button('pack-skip'), phase !== 'complete');
    setVisible(button('pack-show-all'), phase === 'ready');
    setVisible(button('pack-ack'), phase === 'complete');
    for (let index = 0; index < count; index++) {
      const slot = query(`[data-pack-slot="${index}"]`), shown = revealed.has(index);
      if (!slot) continue;
      slot.classList.toggle('is-revealed', shown);
      setVisible(slot.querySelector('[data-pack-face]'), shown);
      setVisible(slot.querySelector('[data-pack-label]'), shown);
      setVisible(slot.querySelector('[data-action="pack-card-reveal"]'), !shown);
    }
    status(phase === 'sealed' ? '按封印，揭曉這份相逢。' : phase === 'opening' ? '封印漸開，旅人將至。' : phase === 'ready' ? `已揭曉 ${revealed.size} / ${count} 張 · 按卡背逐張相見` : `${count} 張戰卡已入藏${receipt.mode === 'god' ? ' · 神契匣，三相同輝' : ''}。`);
  }
  function focusNext() {
    const target = [...element.querySelectorAll('[data-action="pack-card-reveal"]')].find(node => !node.hidden && !node.disabled) || button('pack-ack');
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
    if (isStill()) return finish({ focus: true });
    revealed.add(index);
    for (const slot of element.querySelectorAll('[data-pack-slot]')) slot.classList.remove('just-revealed');
    query(`[data-pack-slot="${index}"]`)?.classList.add('just-revealed');
    if (revealed.size === count) phase = 'complete';
    paint(); announce(`第 ${index + 1} 張：${descriptions[index]}。已入藏。`); focusNext();
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
  return Object.freeze({ open, reveal, finish, syncPreferences, destroy, getState: () => ({ receiptId: receipt.id, phase, revealed: [...revealed], destroyed }) });
}
