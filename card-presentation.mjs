/** Print identity is presentation only. Never looks up a preferred/active copy. */
import { getCard } from './engine.mjs';
import { getPrintForCard } from './printing-catalogue.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const PRINT_TREATMENTS = Object.freeze({
  base: Object.freeze({ name: '本畫', code: 'BASE', mark: '本' }),
  aa: Object.freeze({ name: '異畫', code: 'AA', mark: '畫' }),
  leader: Object.freeze({ name: '領契', code: 'LAA', mark: '契' }),
  ink: Object.freeze({ name: '墨卷', code: 'INK', mark: '墨' }),
  treasure: Object.freeze({ name: '天工', code: 'TR', mark: '珍' }),
});

export function cardPresentation(card, { printId } = {}) {
  const identity = typeof card === 'string' ? getCard(card) : card;
  const print = getPrintForCard(identity.id, printId);
  const { src, columns, rows, index } = print.art;
  const x = columns > 1 ? index % columns / (columns - 1) * 100 : 50;
  const y = rows > 1 ? Math.floor(index / columns) / (rows - 1) * 100 : 35;
  const size = columns === 1 && rows === 1 ? 'cover' : `${columns * 100}% ${rows * 100}%`;
  return Object.freeze({
    printId: print.id, setId: print.setId, treatment: print.treatment, name: print.name,
    label: `${PRINT_TREATMENTS[print.treatment].name} ${PRINT_TREATMENTS[print.treatment].code} · ${print.name}`,
    artStyle: `background-image:url('${src}');background-position:${x}% ${y}%;background-size:${size};background-repeat:no-repeat`,
  });
}
export const cardArtStyle = (card, options) => cardPresentation(card, options).artStyle;
export const printLabel = (card, options) => cardPresentation(card, options).label;

export function printFrameMarkup(card, options) {
  const print = cardPresentation(card, options), treatment = PRINT_TREATMENTS[print.treatment];
  if (print.treatment === 'base') return '';
  const corners = print.treatment === 'aa'
    ? '<svg viewBox="0 0 300 400" preserveAspectRatio="none"><path d="M9 57V25Q9 9 25 9h32M12 43q19 3 12-11q-3-8 6-9q9 0 8-11M243 9h32q16 0 16 16v32M257 12q-3 19 11 12q8-3 9 6q0 9 11 8M9 343v32q0 16 16 16h32M12 357q19-3 12 11q-3 8 6 9q9 0 8 11M243 391h32q16 0 16-16v-32M257 388q-3-19 11-12q8 3 9-6q0-9 11-8"/></svg>'
    : print.treatment === 'treasure'
      ? '<svg viewBox="0 0 300 400" preserveAspectRatio="none"><path d="M12 72V12h60m156 0h60v60M12 328v60h60m156 0h60v-60M20 61V20h41m178 0h41v41M20 339v41h41m178 0h41v-41M105 10l10 7 10-7 10 7 15-9 15 9 10-7 10 7 10-7M105 390l10-7 10 7 10-7 15 9 15-9 10 7 10-7 10 7"/><circle cx="150" cy="157" r="93" stroke-dasharray="2 7"/></svg>'
      : '';
  return `<span class="print-ornament print-ornament-${print.treatment}" aria-hidden="true">${corners}</span><span class="print-treatment-mark" title="${safe(print.label)}" aria-hidden="true"><span>${treatment.mark}</span><small>${treatment.code}</small></span>`;
}

export function leaderInstance(profile) {
  const instance = profile.instances?.find(item => item.uid === profile.wx01?.leaderInstanceId);
  if (!instance) return null;
  try { return cardPresentation(instance.cardId, { printId: instance.printId }).treatment === 'leader' ? instance : null; }
  catch { return null; }
}

export function leaderPortraitMarkup(profile, { className = 'leader-portrait' } = {}) {
  const instance = leaderInstance(profile);
  if (!instance) return '';
  const presentation = cardPresentation(instance.cardId, { printId: instance.printId });
  return `<button type="button" class="${safe(className)}" data-action="instance-inspect" data-id="${safe(instance.uid)}" data-print-id="${safe(instance.printId)}" aria-label="查看目前領契：${safe(presentation.name)}"><span aria-hidden="true" style="${presentation.artStyle}"></span><i aria-hidden="true">契</i></button>`;
}
