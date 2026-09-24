/** In-memory viewport navigation. No profile, battle, storage, timers or RNG. */
export function paginateItems({ ids, capacity = 1, anchorId = null, page = 0 }) {
  if (!Array.isArray(ids)) throw new TypeError('Page identities must be an array.');
  capacity = Number.isFinite(capacity) ? Math.max(1, Math.floor(capacity)) : 1;
  const total = ids.length, pageCount = Math.max(1, Math.ceil(total / capacity));
  page = Number.isFinite(page) ? Math.max(0, Math.min(pageCount - 1, Math.floor(page))) : 0;
  if (anchorId !== null) {
    const index = ids.indexOf(anchorId);
    page = index < 0 ? 0 : Math.floor(index / capacity);
  }
  const start = page * capacity, end = Math.min(total, start + capacity);
  return { ids: ids.slice(start, end), capacity, page, pageCount, start, end, total, anchorId: ids[start] ?? null };
}

/** Use the tallest item so variable-height cards can never overlap the pager. */
export function measurePageCapacity({ availableHeight, itemHeights, columns = 1, rowGap = 0 }) {
  const height = Math.max(0, Number(availableHeight) || 0), gap = Math.max(0, Number(rowGap) || 0);
  columns = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1;
  const rowHeight = Math.max(0, ...itemHeights.filter(Number.isFinite));
  const rows = rowHeight > 0 ? Math.max(1, Math.floor((height + gap + 0.5) / (rowHeight + gap))) : 1;
  return { capacity: rows * columns, rows, columns, rowHeight, overflow: rowHeight > height + 0.5 };
}

const moduleSelector = '[data-viewport-module]';
const listSelector = '[data-viewport-list]';
const actionSelector = '[data-viewport-action]';
const number = value => Number.parseFloat(value) || 0;
function identity(item, index) {
  const own = node => node?.dataset.viewportId || node?.dataset.instanceId || node?.dataset.uid || node?.dataset.id || node?.dataset.cardId || node?.id;
  return own(item) || own(item.querySelector('[data-viewport-id],[data-instance-id],[data-uid],[data-action][data-id],[data-card-id]')) || `item-${index}`;
}
function focusToken(node) {
  if (!node) return null;
  return { id: node.id || null, action: node.dataset?.action || null, value: node.dataset?.id || null };
}
function matchingFocus(container, token) {
  if (!token) return null;
  const selector = 'button,input,select,textarea,a,[tabindex]';
  return [...(container.matches(selector) ? [container] : []), ...container.querySelectorAll(selector)].find(node => token.id ? node.id === token.id
    : token.action && node.dataset.action === token.action && (node.dataset.id || null) === token.value) || null;
}

export function createViewportController({ document, window, announce = () => {} }) {
  const contexts = new Map(), states = new Map();
  let dead = false, frame = null, serial = 0;
  const request = callback => window.requestAnimationFrame(callback);
  const stateFor = key => {
    if (!states.has(key)) states.set(key, { modules: new Map(), lists: new Map(), focus: null });
    return states.get(key);
  };
  function setHidden(context, node, hidden) { node.hidden = hidden; node.inert = hidden || !!context.originals.get(node)?.inert; }
  function remember(context, node, ownsVisibility = false) {
    if (!context.originals.has(node)) context.originals.set(node, { hidden: node.hidden, inert: node.inert,
      id: node.getAttribute('id'), role: node.getAttribute('role'), labelledby: node.getAttribute('aria-labelledby'), viewportId: node.getAttribute('data-viewport-id'), ownsVisibility });
    else if (ownsVisibility) context.originals.get(node).ownsVisibility = true;
  }
  function button(label, action) {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
    node.dataset.viewportAction = action; return node;
  }
  function rememberFocus(context, target) {
    const list = target.closest?.(listSelector), record = context.lists.find(item => item.list === list);
    if (!record) return;
    const index = record.items.findIndex(item => item === target || item.contains(target));
    if (index < 0) return;
    const state = stateFor(context.key), itemId = record.ids[index];
    record.state.anchorId = itemId;
    state.focus = { listKey: record.key, itemId, token: focusToken(target) };
  }
  function cleanup(context) {
    context.observer?.disconnect();
    for (const [node, original] of context.originals) {
      // Pack/scene controllers own surface and list-root visibility. Their live
      // phase changes must survive a pagination refresh or teardown.
      if (original.ownsVisibility) { node.hidden = original.hidden; node.inert = original.inert; }
      for (const [attribute, value] of [['id', original.id], ['role', original.role], ['aria-labelledby', original.labelledby], ['data-viewport-id', original.viewportId]]) {
        if (value === null) node.removeAttribute(attribute); else node.setAttribute(attribute, value);
      }
      for (const name of ['viewportReady', 'viewportOverflow', 'page', 'pageCount', 'visibleCount']) delete node.dataset[name];
    }
    for (const { frame, list } of context.lists) { if (frame.parentNode) frame.replaceWith(list); }
    for (const surface of context.surfaces) surface.tabs.remove();
  }
  function renderList(context, record, { requestedPage, focusControl = false, anchorId } = {}) {
    const { list, items, ids, pager, previous, next, status, state } = record;
    if (list.closest('[hidden]') || !list.isConnected) return;
    const active = document.activeElement;
    const focusIndex = items.findIndex(item => item === active || item.contains(active));
    if (anchorId !== undefined) state.anchorId = anchorId;
    else if (requestedPage === undefined && focusIndex >= 0) state.anchorId = ids[focusIndex];
    // Synchronous measurement: all candidates use their normal size, then the
    // accepted page is hidden before the next browser paint. Never scale text.
    items.forEach(item => { item.hidden = false; });
    const style = window.getComputedStyle(list), box = list.getBoundingClientRect();
    const rectangles = items.map(item => item.getBoundingClientRect());
    const first = rectangles[0], columns = first ? Math.max(1, rectangles.filter(rect => Math.abs(rect.top - first.top) < 2).length) : 1;
    const heights = rectangles.map((rect, index) => {
      const itemStyle = window.getComputedStyle(items[index]);
      return rect.height + number(itemStyle.marginTop) + number(itemStyle.marginBottom);
    });
    const measured = measurePageCapacity({ availableHeight: box.height - number(style.paddingTop) - number(style.paddingBottom),
      itemHeights: heights, columns, rowGap: number(style.rowGap) });
    const page = paginateItems({ ids, capacity: measured.capacity, page: requestedPage ?? state.page,
      anchorId: requestedPage === undefined ? state.anchorId : null });
    state.page = page.page; state.anchorId = page.anchorId; record.page = page;
    items.forEach((item, index) => setHidden(context, item, index < page.start || index >= page.end));
    list.dataset.page = String(page.page + 1); list.dataset.pageCount = String(page.pageCount);
    list.dataset.visibleCount = String(page.ids.length); list.dataset.viewportOverflow = String(measured.overflow);
    previous.disabled = page.page === 0; next.disabled = page.page >= page.pageCount - 1;
    status.textContent = page.total ? `第 ${page.page + 1} / ${page.pageCount} 頁 · ${page.start + 1}–${page.end} / ${page.total}` : '暫無項目';
    pager.dataset.pageCount = String(page.pageCount);
    if (focusControl || (focusIndex >= 0 && items[focusIndex].hidden)) {
      const control = !next.disabled ? next : !previous.disabled ? previous : status;
      control.focus({ preventScroll: true });
    }
  }
  function renderContext(context) {
    if (dead || !context.root.isConnected) return;
    for (const record of context.lists) renderList(context, record);
    for (const surface of context.surfaces) {
      if (surface.node.closest('[hidden]')) continue;
      const bounds = surface.node.getBoundingClientRect();
      const active = surface.modules.find(module => !module.hidden);
      const overflow = !!active && (active.getBoundingClientRect().bottom > bounds.bottom + 1
        || [...active.querySelectorAll('[data-viewport-overflow="true"]')].length > 0
        || active.scrollHeight > active.clientHeight + 1);
      surface.node.dataset.viewportOverflow = String(overflow);
    }
  }
  function schedule() {
    if (dead || frame !== null) return;
    frame = request(() => { frame = null; for (const context of contexts.values()) renderContext(context); });
  }
  function chooseModule(context, surface, index, focus = false) {
    const module = surface.modules[index]; if (!module) return;
    stateFor(context.key).modules.set(surface.key, module.dataset.viewportModule);
    surface.modules.forEach((item, position) => {
      const selected = position === index, tab = surface.buttons[position];
      setHidden(context, item, !selected); tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    });
    renderContext(context);
    if (focus) surface.buttons[index].focus({ preventScroll: true });
    if (focus) announce(module.dataset.viewportLabel || module.dataset.viewportModule);
  }
  function act(event) {
    const control = event.target.closest?.(actionSelector); if (!control || control.disabled) return;
    const context = [...contexts.values()].find(item => item.root.contains(control)); if (!context) return;
    const surface = context.surfaces.find(item => item.buttons.includes(control));
    if (surface) {
      let index = surface.buttons.indexOf(control);
      if (event.type === 'keydown') {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        index = event.key === 'Home' ? 0 : event.key === 'End' ? surface.buttons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + surface.buttons.length) % surface.buttons.length;
      }
      chooseModule(context, surface, index, true); return;
    }
    if (event.type !== 'click') return;
    const record = context.lists.find(item => item.pager.contains(control)); if (!record) return;
    stateFor(context.key).focus = null;
    const requestedPage = record.page.page + (control.dataset.viewportAction === 'previous' ? -1 : 1);
    renderList(context, record, { requestedPage, focusControl: true }); announce(record.status.textContent);
  }
  const focus = event => { for (const context of contexts.values()) if (context.root.contains(event.target)) rememberFocus(context, event.target); };

  function refresh({ key, root }) {
    if (dead || !root) return;
    const previous = contexts.get(root), sameKey = previous?.key === key;
    if (previous) { rememberFocus(previous, document.activeElement); cleanup(previous); }
    const state = stateFor(key), context = { key, root, originals: new Map(), lists: [], surfaces: [], observer: null };
    contexts.set(root, context);
    const nodes = [...(root.matches?.('[data-viewport-surface]') ? [root] : []), ...root.querySelectorAll('[data-viewport-surface]')];
    for (const [surfaceIndex, node] of nodes.entries()) {
      remember(context, node); node.dataset.viewportReady = 'true';
      const modules = [...node.querySelectorAll(moduleSelector)].filter(module => module.closest('[data-viewport-surface]') === node);
      if (!modules.length) continue;
      const surfaceKey = node.dataset.viewportSurface || `surface-${surfaceIndex}`, tabs = document.createElement('nav');
      tabs.className = 'viewport-module-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', node.dataset.viewportLabel || '此頁分區');
      tabs.hidden = modules.length < 2;
      const surface = { node, key: surfaceKey, tabs, modules, buttons: [] };
      for (const [index, module] of modules.entries()) {
        remember(context, module, true);
        const moduleId = module.dataset.viewportModule, unique = `viewport-${++serial}`;
        const tab = button(module.dataset.viewportLabel || moduleId, 'module');
        tab.dataset.viewportTarget = moduleId; tab.id = `${unique}-tab`; tab.setAttribute('role', 'tab');
        module.id ||= `${unique}-panel`; module.setAttribute('role', 'tabpanel'); module.setAttribute('aria-labelledby', tab.id);
        tab.setAttribute('aria-controls', module.id); tabs.append(tab); surface.buttons.push(tab);
        const lists = [...module.querySelectorAll(listSelector)].filter(list => list.closest(moduleSelector) === module && list.closest('[data-viewport-surface]') === node);
        for (const [listIndex, list] of lists.entries()) {
          remember(context, list);
          const listKey = `${surfaceKey}/${moduleId}/${list.dataset.viewportList || listIndex}`;
          if (!state.lists.has(listKey)) state.lists.set(listKey, { page: 0, anchorId: null });
          const items = [...list.children].filter(item => !item.hidden && !item.hasAttribute('data-viewport-exclude'));
          items.forEach(item => remember(context, item, true));
          const ids = items.map(identity), seen = new Set();
          // Explicit UID markers are preferred. Position suffixes avoid confusing
          // two unrelated unmarked cards if a caller supplies duplicate labels.
          ids.forEach((id, position) => { if (seen.has(id)) ids[position] = `${id}/${position}`; seen.add(ids[position]); });
          items.forEach((item, index) => { item.dataset.viewportId = ids[index]; });
          const frame = document.createElement('div'); frame.className = 'viewport-list-frame';
          list.replaceWith(frame); frame.append(list);
          const pager = document.createElement('nav'); pager.className = 'viewport-pagination'; pager.setAttribute('aria-label', list.dataset.viewportLabel || '項目分頁');
          const previousButton = button('← 上頁', 'previous'), next = button('下頁 →', 'next'), status = document.createElement('span');
          status.dataset.viewportStatus = ''; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.tabIndex = -1;
          for (const control of [previousButton, next]) { control.dataset.viewportListId = list.dataset.viewportList || String(listIndex); }
          pager.append(previousButton, status, next); frame.append(pager);
          context.lists.push({ key: listKey, list, module, items, ids, frame, pager, previous: previousButton, next, status, state: state.lists.get(listKey), page: null });
        }
        const desired = module.hasAttribute('data-viewport-default') && module.dataset.viewportDefault !== 'false';
        if (desired) surface.preferred = index;
      }
      node.prepend(tabs); context.surfaces.push(surface);
      const selected = surface.preferred ?? Math.max(0, modules.findIndex(module => module.dataset.viewportModule === state.modules.get(surfaceKey)));
      surface.modules.forEach((module, index) => { setHidden(context, module, index !== selected); surface.buttons[index].setAttribute('aria-selected', String(index === selected)); surface.buttons[index].tabIndex = index === selected ? 0 : -1; });
      state.modules.set(surfaceKey, modules[selected].dataset.viewportModule);
    }
    renderContext(context);
    if (sameKey && state.focus && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) {
      const record = context.lists.find(item => item.key === state.focus.listKey && !item.module.hidden);
      const index = record?.ids.indexOf(state.focus.itemId) ?? -1;
      if (index >= 0) {
        record.state.anchorId = state.focus.itemId; renderList(context, record);
        matchingFocus(record.items[index], state.focus.token)?.focus({ preventScroll: true });
      }
    }
    if (window.ResizeObserver) {
      context.observer = new window.ResizeObserver(schedule);
      for (const surface of context.surfaces) context.observer.observe(surface.node);
      // A status line or action row can change the list's allocation while the
      // outer viewport stays fixed (for example, during a battle reveal).
      for (const record of context.lists) context.observer.observe(record.frame);
    }
    schedule();
  }
  document.addEventListener('click', act); document.addEventListener('keydown', act); document.addEventListener('focusin', focus);
  document.addEventListener('load', schedule, true); window.addEventListener('resize', schedule); window.visualViewport?.addEventListener('resize', schedule);
  document.fonts?.addEventListener?.('loadingdone', schedule);
  function selectModule({ key, moduleId, surfaceId, focus = true }) {
    if (dead) return false;
    for (const context of contexts.values()) {
      if (context.key !== key) continue;
      for (const surface of context.surfaces) {
        if (surfaceId !== undefined && surface.key !== surfaceId) continue;
        const index = surface.modules.findIndex(module => module.dataset.viewportModule === moduleId);
        if (index >= 0) { chooseModule(context, surface, index, focus); return true; }
      }
    }
    return false;
  }
  function revealElement(element, { focus = false } = {}) {
    if (dead || !element?.isConnected) return false;
    const context = [...contexts.values()].find(item => item.root.contains(element));
    if (!context) return false;
    // Open enclosing modules from the outside in, including nested surfaces.
    for (const surface of context.surfaces) {
      const index = surface.modules.findIndex(module => module === element || module.contains(element));
      if (index >= 0) chooseModule(context, surface, index, false);
    }
    const record = context.lists.find(item => item.list === element || item.list.contains(element));
    if (record) {
      const index = record.items.findIndex(item => item === element || item.contains(element));
      if (index >= 0) renderList(context, record, { anchorId: record.ids[index] });
    }
    if (focus && !element.closest('[hidden]')) element.focus?.({ preventScroll: true });
    return !element.closest('[hidden]');
  }
  return { refresh, selectModule, revealElement, destroy() {
    if (dead) return; dead = true;
    if (frame !== null) window.cancelAnimationFrame(frame); frame = null;
    for (const context of contexts.values()) cleanup(context); contexts.clear(); states.clear();
    document.removeEventListener('click', act); document.removeEventListener('keydown', act); document.removeEventListener('focusin', focus);
    document.removeEventListener('load', schedule, true); window.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('resize', schedule);
    document.fonts?.removeEventListener?.('loadingdone', schedule);
  } };
}
