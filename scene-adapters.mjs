/** Presentation-only scene structure. Nodes are moved, never cloned or persisted. */
const one = (root, selector) => root.querySelector(selector);
const many = (root, selector) => [...root.querySelectorAll(selector)];
function box(root, className = '') {
  const node = root.ownerDocument.createElement('section'); node.className = className; return node;
}
function module(root, id, label, nodes) {
  const panel = box(root, 'scene-module'); panel.dataset.viewportModule = id; panel.dataset.viewportLabel = label;
  for (const node of nodes.flat().filter(Boolean)) panel.append(node);
  root.append(panel); return panel;
}
function list(node, id) {
  if (!node) return;
  node.dataset.viewportList = id;
  [...node.children].forEach((child, index) => {
    const target = child.matches('[data-id],[data-instance-id],[data-card-id]') ? child : one(child, '[data-instance-id],[data-id],[data-card-id]');
    child.dataset.viewportId ||= child.dataset.uid || target?.dataset.instanceId || target?.dataset.id || target?.dataset.cardId || `${id}-${index}`;
  });
}
function surface(node, id) { node.dataset.viewportSurface = id; node.classList.add('scene-surface'); }
function bag(main) {
  surface(main, 'bag');
  const inventory = one(main, '.bag-character-inventory');
  if (inventory) { main.classList.add('bag-character-inventory'); main.dataset.cardId = inventory.dataset.cardId; main.append(...inventory.childNodes); inventory.remove(); }
  const cards = one(main, '.bag-grid'), controls = one(main, '.bag-controls');
  if (one(main, '.bag-draft')) {
    const draft = one(main, '.bag-draft'), collection = one(main, '.bag-draft-collection');
    const slots = one(main, '.bag-deck-slots'), tray = one(main, '.bag-draft-tray');
    const advice = many(draft, '.bag-draft-heading p,.bag-draft-heading .text-button');
    const results = one(collection, '.bag-results');
    module(main, 'decks', '牌組', [slots]); list(slots, 'decks');
    module(main, 'draft', '陣位', [one(main, '.bag-draft-heading'), tray]); list(tray, 'draft');
    module(main, 'cards', '選卡', [one(collection, '.section-heading'), cards, one(collection, '.bag-empty')]); list(cards, 'pick-cards');
    module(main, 'save', '儲存', [one(draft, '.bag-draft-save'), one(draft, '.bag-draft-message')]);
    module(main, 'filters', '篩選', [controls, results]);
    module(main, 'guide', '編組說明', advice);
    draft.remove(); collection.remove();
  } else {
    const results = one(main, '.bag-results');
    module(main, 'cards', '藏卡', [inventory ? null : results, cards, one(main, '.bag-empty')]); list(cards, 'cards');
    module(main, 'filters', '篩選', [controls, inventory ? results : null]);
    const arrangement = one(main, '.bag-browse-bar');
    if (arrangement) module(main, 'arrangement', '排列方式', [arrangement]);
    const versions = one(main, '.bag-print-tabs');
    if (versions) { module(main, 'versions', '畫作版本', [versions]); list(versions, 'versions'); }
  }
}
function codex(main) {
  surface(main, 'codex');
  const cards = one(main, '.collection-grid');
  module(main, 'cards', '圖鑑', [one(main, '.codex-legend'), cards, one(main, '.codex-empty')]); list(cards, 'characters');
  module(main, 'filters', '尋找角色', [one(main, '.collection-sets'), one(main, '.codex-tools'), one(main, '.filters')]);
}
function account(main) {
  surface(main, 'account');
  const shell = one(main, '.account-shell');
  if (!shell) return;
  main.classList.add('account-shell'); main.setAttribute('aria-busy', shell.getAttribute('aria-busy'));
  main.append(...shell.childNodes); shell.remove();
  const local = one(main, '.account-panel.local'), cloud = one(main, '.account-panel.cloud');
  const localPanel = module(main, 'local', '此裝置', [local]);
  const cloudPanel = module(main, 'cloud', '雲端旅程', [cloud]);
  const confirmation = one(cloud, '.account-confirmation');
  if (confirmation) module(main, 'confirmation', '確認操作', [confirmation]).dataset.viewportDefault = 'true';
  const tools = module(main, 'tools', '旅程工具', []), utilities = box(main, 'scene-account-tools');
  utilities.append(...[one(main, '.game-utilities'), one(main, '.account-recovery'), one(main, '.account-footer-note')].filter(Boolean));
  tools.append(utilities); list(utilities, 'account-tools');
  one(main, '.account-columns')?.remove();
  // Each complete account block stays together; summary and controls have their
  // own pages so authenticated backups and warnings remain fully reachable.
  for (const [panel, content, id] of [[localPanel, local, 'local'], [cloudPanel, cloud, 'cloud']]) {
    if (!content) continue;
    if (one(content, '.account-auth,.account-welcome')) continue;
    list(content, `account-${id}`);
  }
}
/** One primary 對局 table: both public four-card rows, the confrontation and
 * the move stay on a single module. No tabs and no pages; history and full card
 * text remain in their dialogs. */
function battle(main) {
  surface(main, 'battle');
  module(main, 'table', '對局', [...main.children]);
}
export function prepareScene(root, { screen } = {}) {
  const main = one(root, 'main'); if (!main || main.dataset.sceneAdapted) return;
  main.dataset.sceneAdapted = 'true';
  if (screen === 'bag') bag(main);
  else if (screen === 'collection') codex(main);
  else if (screen === 'account') account(main);
  else if (screen === 'battle' && main.matches('.battle-table')) battle(main);
}

/** The opening controller owns phase visibility. Each visible pack has a
 * nested page surface; changing a page never reveals or grants a card. */
export function preparePack(dialog) {
  const opening = one(dialog, '.pack-opening'); if (!opening || opening.dataset.sceneAdapted) return;
  opening.dataset.sceneAdapted = 'true'; opening.classList.add('scene-pack');
  const panels = many(opening, '[data-box-panel]');
  if (panels.length) {
    panels.forEach((panel, index) => {
      surface(panel, `pack-${index}`); const cards = box(panel, 'scene-pack-cards'); cards.append(...panel.childNodes);
      module(panel, 'cards', '此匣藏畫', [cards]); list(cards, `pack-${index}-cards`);
    });
  } else {
    const cards = one(opening, '[data-pack-cards]'); surface(cards, 'pack');
    const tiles = box(cards, 'scene-pack-cards'); tiles.append(...cards.childNodes);
    module(cards, 'cards', '此匣藏畫', [tiles]); list(tiles, 'pack-cards');
  }
  const overview = one(opening, '[data-box-overview]');
  if (overview) {
    surface(overview, 'box-overview'); const cards = one(overview, '.box-overview-grid');
    module(overview, 'cards', '逐匣藏畫', [cards]); list(cards, 'box-packs');
    module(overview, 'summary', '整盒收穫', [one(overview, '.box-overview-heading'), one(overview, '.box-hit-counts')]);
  }
}
