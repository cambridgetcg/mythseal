/** Rearrange existing dialog nodes into reachable pages; never clone actions or change game state. */
const children = node => [...node.children];
const present = nodes => nodes.filter(Boolean);
function create(parent, tag, className = '') { const node = parent.ownerDocument.createElement(tag); node.className = className; return node; }
function section(anchor, id, label, nodes = []) {
  const node = create(anchor, 'section', `dialog-module dialog-module-${id}`);
  node.dataset.viewportModule = id; node.dataset.viewportLabel = label;
  node.append(...present(nodes)); anchor.append(node); return node;
}
function paged(node, id, { grid = false } = {}) {
  node.dataset.viewportList = id; node.classList.add(grid ? 'dialog-page-grid' : 'dialog-page-list');
  children(node).forEach((item, index) => {
    item.dataset.viewportId ||= item.dataset.uid || item.dataset.materialUid || item.dataset.printId
      || item.querySelector('[data-id]')?.dataset.id || `${id}-${index}`;
  });
  return node;
}
function list(parent, id, nodes, options) {
  const node = create(parent, 'div'); node.append(...present(nodes)); parent.append(node); return paged(node, id, options);
}
function fixed(node, className = '') { if (node) { node.dataset.dialogFixed = ''; if (className) node.classList.add(className); } return node; }
function finish(anchor) {
  const leftovers = children(anchor).filter(node => !node.matches('.modal-close,[data-viewport-module],[data-dialog-fixed],.viewport-module-tabs'));
  if (leftovers.length) list(section(anchor, 'more', '補充'), 'more-content', leftovers);
}
function heading(anchor) {
  for (const node of children(anchor).filter(node => node.matches('.eyebrow,h2'))) fixed(node, 'dialog-compact-heading');
}
function fixedActions(anchor) {
  for (const node of children(anchor).filter(node => node.matches('.modal-actions,.battle-reveal-footer,.match-return'))) fixed(node, 'dialog-fixed-actions');
}
function passport(anchor) {
  const layout = anchor.querySelector('.bag-passport'), art = layout.querySelector('.bag-passport-art'), level = layout.querySelector('.bag-passport-level');
  const title = anchor.querySelector('.bag-passport-heading'); fixed(title, 'dialog-compact-heading');
  section(anchor, 'portrait', '卡面', [art, level]);
  const history = section(anchor, 'history', '同行記');
  const facts = layout.querySelector('.bag-passport-facts'), lore = layout.querySelector('.bag-passport-lore');
  history.append(paged(facts, 'passport-facts')); if (lore) history.append(lore);
  layout.remove();
  const actions = children(anchor).filter(node => node.matches('.bag-leader-choice,.bag-inheritance-entry,.bag-passport-upgrade,.bag-passport-actions,.bag-action-note,.bag-pve-note'));
  if (actions.length) list(section(anchor, 'training', '修練與保管'), 'passport-actions', actions);
  fixedActions(anchor); finish(anchor);
}
function detail(anchor) {
  heading(anchor);
  const layout = anchor.querySelector('.detail-layout'), art = layout.querySelector('.card'), copy = [...layout.children].find(node => node !== art);
  const information = children(copy), intro = information.filter(node => node.matches('.eyebrow,h2,.detail-rank,.detail-source'));
  const portrait = section(anchor, 'portrait', '卡面', [art]);
  const title = create(anchor, 'div', 'dialog-card-summary'); title.append(...intro); portrait.append(title);
  const notes = children(anchor).filter(node => node.matches('.codex-detail-note'));
  list(section(anchor, 'lore', '人物與弈道'), 'card-details', [...notes, ...children(copy)]);
  layout.remove(); fixedActions(anchor); finish(anchor);
}
function inheritance(anchor) {
  const title = anchor.querySelector('.inheritance-heading'); fixed(title, 'dialog-compact-heading');
  const target = anchor.querySelector('.inheritance-target'); section(anchor, 'target', '主卡', [target]);
  const materials = anchor.querySelector('.inheritance-materials,.inheritance-confirm-list');
  if (materials) {
    const pick = section(anchor, 'materials', '素材');
    const materialHeading = anchor.querySelector('.inheritance-material-heading') || materials.querySelector('h3');
    const explanation = anchor.querySelector('.inheritance-explanation');
    if (explanation) list(section(anchor, 'rules', '規則'), 'inheritance-rules', [materialHeading, explanation]);
    else if (materialHeading) pick.append(materialHeading);
    pick.append(paged(materials, 'inheritance-materials'));
  }
  const decision = section(anchor, 'decision', anchor.classList.contains('inheritance-result') ? '結果' : '確認');
  const notes = children(anchor).filter(node => node.matches('.inheritance-kept,.inheritance-pve-note,.inheritance-error,.inheritance-overflow,.inheritance-result-gain'));
  list(decision, 'inheritance-notes', notes);
  const footer = anchor.querySelector('.inheritance-footer'); if (footer) decision.append(footer);
  finish(anchor);
}
function preparation(anchor) {
  // The encounter remains visible while viewing/changing the selected deck.
  const encounterTitle = anchor.querySelector('h2');
  if (encounterTitle) { fixed(encounterTitle, 'dialog-compact-heading'); anchor.prepend(encounterTitle); }
  const actions = anchor.querySelector('.modal-actions'); fixed(actions, 'dialog-fixed-actions');
  const deckHeading = anchor.querySelector('.prep-deck-heading'), cards = anchor.querySelector('.prep-deck-strip');
  const deck = section(anchor, 'deck', '同行戰卡', [deckHeading]); if (cards) deck.append(paged(cards, 'preparation-cards', { grid: true }));
  const footnote = anchor.querySelector('.panel-footnote'); if (footnote) deck.append(footnote);
  const arrival = children(anchor).filter(node => !node.matches('[data-viewport-module],[data-dialog-fixed]'));
  const entry = section(anchor, 'arrival', '出發前整備'); list(entry, 'preparation-arrival', arrival);
  // The arrival remains the first route despite collecting the deck nodes first.
  anchor.insertBefore(entry, deck); finish(anchor);
}
function rules(anchor) {
  heading(anchor); fixedActions(anchor);
  const rules = anchor.querySelector('.rules-grid'), note = anchor.querySelector('.rules-note');
  if (note) rules.append(note);
  const module = section(anchor, 'rules', '弈道'); module.append(paged(rules, 'rules'));
  const intro = children(anchor).filter(node => node.tagName === 'P'); if (intro.length) module.prepend(...intro);
  finish(anchor);
}
function settings(anchor) {
  heading(anchor); fixedActions(anchor);
  const nodes = children(anchor).filter(node => !node.matches('[data-dialog-fixed],.modal-close'));
  list(section(anchor, 'settings', '聲息與節奏'), 'experience-settings', nodes); finish(anchor);
}
function roundResult(anchor) {
  heading(anchor);
  const status = anchor.querySelector('[data-reveal-status]'); fixed(status, 'dialog-reveal-status');
  const seal = anchor.querySelector('.mist-reveal-seal'), caption = anchor.querySelector('.mist-reveal-caption');
  fixed(seal, 'dialog-decorative-seal'); fixed(caption, 'dialog-reveal-caption');
  const clash = anchor.querySelector('.battle-clash'); section(anchor, 'clash', '落子揭曉', [clash]);
  const resources = anchor.querySelector('.battle-resource-results'), resolution = anchor.querySelector('.resolution');
  const resourceModule = section(anchor, 'resources', '生命與仙丹', [resources]);
  if (resources) paged(resources, 'round-resources');
  const effects = anchor.querySelector('.result-effects');
  if (effects) { if (resolution) effects.prepend(resolution); section(anchor, 'effects', '技能與共鳴', [paged(effects, 'round-effects')]); }
  fixedActions(anchor); finish(anchor); return resourceModule;
}
function matchResult(anchor) {
  fixedActions(anchor);
  const rewards = anchor.querySelector('.earned-rewards'), history = anchor.querySelector('.round-history');
  const story = anchor.querySelector('.story-result,.mist-result-note');
  if (rewards) {
    const module = section(anchor, 'rewards', '旅途所得', [rewards]); rewards.dataset.viewportFill = '';
    const experience = rewards.querySelector('.card-xp-results');
    if (experience) {
      section(anchor, 'experience', '同行歷練', [experience]);
      experience.dataset.viewportFill = '';
      const rows = children(experience).filter(node => node.tagName === 'DIV'); list(experience, 'battle-experience', rows);
    }
    module.classList.add('dialog-rewards-module');
  }
  if (history) section(anchor, 'history', '回合紀錄', [paged(history, 'round-history')]);
  if (story) list(section(anchor, 'story', '此程後記'), 'story-result', [...anchor.querySelectorAll(':scope > .story-result,:scope > .mist-result-note')]);
  const outcome = children(anchor).filter(node => !node.matches('[data-viewport-module],[data-dialog-fixed],.modal-close'));
  const module = section(anchor, 'outcome', '勝負已定'); list(module, 'match-outcome', outcome);
  anchor.insertBefore(module, children(anchor).find(node => node.hasAttribute('data-viewport-module'))); finish(anchor);
}
function odds(anchor) {
  heading(anchor); fixedActions(anchor);
  const table = anchor.querySelector('table'), notes = anchor.querySelector('.wx01-odds-notes');
  const rates = section(anchor, 'rates', '開匣機率');
  // A row-paged table keeps the heading association without invalid wrappers
  // inside a native table. Move cell contents; never recalculate displayed odds.
  if (table) {
    const grid = create(anchor, 'div', 'dialog-odds-table'); grid.setAttribute('role', 'table');
    grid.dataset.viewportFill = '';
    const caption = create(anchor, 'p', 'dialog-odds-caption'); caption.append(...table.querySelector('caption').childNodes); rates.append(caption);
    grid.setAttribute('aria-label', caption.textContent);
    const rows = [...table.querySelectorAll('tr')].map((row, index) => {
      const target = create(anchor, 'div', 'dialog-odds-row'); target.setAttribute('role', 'row');
      for (const [column, cell] of children(row).entries()) {
        const value = create(anchor, 'span'); value.setAttribute('role', index === 0 ? 'columnheader' : column === 0 ? 'rowheader' : 'cell');
        value.append(...cell.childNodes); target.append(value);
      }
      return target;
    });
    grid.append(rows.shift()); list(grid, 'odds-rates', rows); rates.append(grid); table.remove();
  }
  const intro = children(anchor).filter(node => node.tagName === 'P');
  if (notes) {
    const module = section(anchor, 'explanation', '機率細則'), blocks = [];
    for (const node of children(notes)) {
      if (node.tagName === 'H3' || !blocks.length) blocks.push(create(anchor, 'article', 'dialog-odds-note'));
      blocks.at(-1).append(node);
    }
    list(module, 'odds-explanation', [...intro, ...blocks]); notes.remove();
  }
  finish(anchor);
}
function redemption(anchor) {
  heading(anchor);
  const grid = anchor.querySelector('.wx01-redeem-grid'), tabs = anchor.querySelector('.wx01-redeem-tabs');
  const choose = section(anchor, 'choose', '自選畫作', [tabs, grid]); if (grid) paged(grid, 'redeem-prints', { grid: true });
  const notes = children(anchor).filter(node => node.tagName === 'P');
  if (notes.length) list(section(anchor, 'conditions', '領取條件'), 'redeem-conditions', notes);
  finish(anchor); return choose;
}
function legacyPack(anchor) {
  heading(anchor); fixedActions(anchor);
  const cards = anchor.querySelector('.pack-reveal');
  if (cards) section(anchor, 'cards', '三份緣', [paged(cards, 'legacy-pack-cards', { grid: true })]);
  const notes = children(anchor).filter(node => node.tagName === 'P');
  if (notes.length) list(section(anchor, 'received', '入藏說明'), 'legacy-pack-notes', notes);
  finish(anchor);
}
function fallback(anchor) {
  heading(anchor); fixedActions(anchor);
  const history = anchor.querySelector(':scope > .round-history');
  if (history) section(anchor, 'history', '回合紀錄', [paged(history, 'dialog-history')]);
  const nodes = children(anchor).filter(node => !node.matches('[data-dialog-fixed],[data-viewport-module],.modal-close'));
  list(section(anchor, 'content', '內容'), 'dialog-content', nodes); finish(anchor);
}

export function prepareDialog(dialog, { kind = null } = {}) {
  if (!dialog || kind === 'pack-receipt' || kind === 'quests' || dialog.querySelector('.pack-opening,.quest-content')) return;
  const anchor = dialog.querySelector('.inheritance-panel,.inheritance-confirm,.inheritance-result,.prep-content,.wx01-odds,.wx01-redemption') || dialog;
  if (anchor.dataset.dialogPrepared === 'true' && children(anchor).some(node => node.hasAttribute('data-viewport-module'))) return;
  dialog.classList.add('viewport-dialog', 'scene-dialog'); anchor.classList.add('scene-dialog-surface');
  anchor.dataset.viewportSurface = `dialog-${kind || 'content'}`; anchor.dataset.dialogPrepared = 'true';
  if (anchor.matches('.inheritance-panel,.inheritance-confirm,.inheritance-result')) inheritance(anchor);
  else if (anchor.matches('.prep-content')) preparation(anchor);
  else if (anchor.matches('.wx01-odds')) odds(anchor);
  else if (anchor.matches('.wx01-redemption')) redemption(anchor);
  else if (dialog.querySelector('.bag-passport')) passport(anchor);
  else if (dialog.querySelector('.detail-layout')) detail(anchor);
  else if (dialog.querySelector('.pack-reveal')) legacyPack(anchor);
  else if (kind === 'round-result') roundResult(anchor);
  else if (kind === 'match-result') matchResult(anchor);
  else if (dialog.querySelector('.rules-grid')) rules(anchor);
  else if (kind === 'experience-settings') settings(anchor);
  else fallback(anchor);
  // Preserve close/continue actions after all reachable modules. Close remains
  // absolutely positioned by the modal shell, all other actions remain in flow.
  for (const footer of children(anchor).filter(node => node.classList.contains('dialog-fixed-actions'))) anchor.append(footer);
}
