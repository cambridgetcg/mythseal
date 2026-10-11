import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateItems, measurePageCapacity, createViewportController } from '../viewport.mjs';

test('pagination covers every exact identity once, clamps pages, and never changes input', () => {
  const ids = Object.freeze(Array.from({ length: 23 }, (_, index) => `copy-${index}`));
  const pages = Array.from({ length: 4 }, (_, page) => paginateItems({ ids, capacity: 6, page }));
  assert.deepEqual(pages.flatMap(page => page.ids), ids);
  assert.deepEqual(pages.map(page => [page.start, page.end]), [[0, 6], [6, 12], [12, 18], [18, 23]]);
  assert.equal(paginateItems({ ids, capacity: 6, page: 90 }).page, 3);
  assert.equal(paginateItems({ ids, capacity: 6, page: -1 }).page, 0);
  assert.deepEqual(paginateItems({ ids: [], capacity: 3 }), { ids: [], capacity: 3, page: 0, pageCount: 1, start: 0, end: 0, total: 0, anchorId: null });
});

test('resize preserves the anchored exact copy; a filter that removes it resets to the first page', () => {
  const ids = Array.from({ length: 20 }, (_, index) => `uid-${index}`);
  assert.deepEqual(paginateItems({ ids, capacity: 3, anchorId: 'uid-13' }).ids, ['uid-12', 'uid-13', 'uid-14']);
  assert.equal(paginateItems({ ids, capacity: 9, anchorId: 'uid-13' }).page, 1);
  assert.equal(paginateItems({ ids: ids.slice(0, 5), capacity: 2, page: 5, anchorId: 'uid-13' }).page, 0);
  for (const capacity of [0, -3, NaN, Infinity]) assert.equal(paginateItems({ ids, capacity }).capacity, 1);
});

test('measured grid capacity reserves complete rows, uses the tallest item and exposes oversized content', () => {
  assert.deepEqual(measurePageCapacity({ availableHeight: 250, itemHeights: [100, 110, 80], columns: 3, rowGap: 12 }),
    { capacity: 6, rows: 2, columns: 3, rowHeight: 110, overflow: false });
  assert.equal(measurePageCapacity({ availableHeight: 231, itemHeights: [110], columns: 2, rowGap: 12 }).capacity, 2);
  assert.deepEqual(measurePageCapacity({ availableHeight: 60, itemHeights: [110], columns: 1 }),
    { capacity: 1, rows: 1, columns: 1, rowHeight: 110, overflow: true });
});

class Events {
  listeners = new Map();
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, event = {}) { for (const callback of this.listeners.get(type) || []) callback({ type, preventDefault() {}, ...event }); }
  count() { return [...this.listeners.values()].reduce((count, callbacks) => count + callbacks.size, 0); }
}
const dataKey = value => value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
function environment() {
  const document = new Events(), window = new Events(), frames = new Map(), observers = [];
  let frameSerial = 0;
  class Node {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.dataset = {}; this.attributes = new Map(); this.children = []; this.parentNode = null; this.hidden = false; this.inert = false; this.id = ''; this.height = 300; this.width = 600; this.columns = 2; }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); } }
    prepend(node) { node.remove(); node.parentNode = this; this.children.unshift(node); }
    remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
    replaceWith(node) { const parent = this.parentNode, index = parent.children.indexOf(this); node.remove(); parent.children[index] = node; node.parentNode = parent; this.parentNode = null; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === 'id') this.id = String(value); if (name.startsWith('data-')) this.dataset[dataKey(name.slice(5))] = String(value); }
    getAttribute(name) { if (name === 'id') return this.id || null; if (name.startsWith('data-')) return this.dataset[dataKey(name.slice(5))] ?? null; return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    removeAttribute(name) { this.attributes.delete(name); if (name === 'id') this.id = ''; if (name.startsWith('data-')) delete this.dataset[dataKey(name.slice(5))]; }
    matches(selector) {
      return selector.split(',').some(part => {
        part = part.trim();
        if (part === '[hidden]') return this.hidden;
        if (part.startsWith('[')) return [...part.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(([, name, value]) => this.hasAttribute(name) && (value === undefined || this.getAttribute(name) === value));
        return this.tagName === part.toUpperCase();
      });
    }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    get isConnected() { return this === document.body || !!this.parentNode?.isConnected; }
    get clientHeight() { return this.height; }
    get scrollHeight() { return this.height; }
    getBoundingClientRect() {
      if (this.closest('[hidden]')) return { top: 0, left: 0, right: 0, bottom: 0, height: 0, width: 0 };
      const list = this.parentNode?.matches('[data-viewport-list]') ? this.parentNode : null;
      const visible = list?.children.filter(child => !child.hidden), index = visible?.indexOf(this) || 0;
      const top = list ? Math.floor(index / list.columns) * (this.height + 10) : 0;
      return { top, left: list ? index % list.columns * 100 : 0, right: this.width, bottom: top + this.height, height: this.height, width: this.width };
    }
    focus() { assert.equal(!!this.closest('[hidden]'), false, 'focus must never enter a hidden page'); document.activeElement = this; document.emit('focusin', { target: this }); }
  }
  document.createElement = tag => new Node(tag); document.body = new Node('body'); document.activeElement = document.body; document.fonts = new Events();
  window.requestAnimationFrame = callback => { const id = ++frameSerial; frames.set(id, callback); return id; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.getComputedStyle = () => ({ paddingTop: '0', paddingBottom: '0', marginTop: '0', marginBottom: '0', rowGap: '10' });
  window.visualViewport = new Events();
  window.ResizeObserver = class { constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } };
  function scene({ items = 9, modules = 2, nested = false } = {}) {
    const root = new Node('main'); root.dataset.viewportSurface = nested ? 'inner' : 'scene'; document.body.append(root);
    for (let index = 0; index < modules; index++) {
      const module = new Node('section'); module.dataset.viewportModule = `module-${index}`; module.dataset.viewportLabel = `分區 ${index}`; root.append(module);
      const list = new Node('div'); list.dataset.viewportList = `list-${index}`; list.height = 190; module.append(list);
      for (let itemIndex = 0; itemIndex < items; itemIndex++) {
        const item = new Node('article'); item.height = 80; item.dataset.viewportId = `uid-${index}-${itemIndex}`; list.append(item);
        const control = new Node('button'); control.dataset.action = 'inspect'; control.dataset.id = item.dataset.viewportId; item.append(control);
      }
    }
    return root;
  }
  const messages = [], controller = createViewportController({ document, window, announce: text => messages.push(text) });
  return { document, window, frames, observers, controller, scene, messages,
    tick() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    click(node) { document.emit('click', { target: node }); },
  };
}

test('controller creates reachable module/page controls, hides and inerts off-page items, and traverses every UID', () => {
  const env = environment(), root = env.scene(); env.controller.refresh({ key: 'bag', root });
  const modules = root.querySelectorAll('[data-viewport-module]'), list = modules[0].querySelector('[data-viewport-list]');
  assert.equal(modules[1].hidden, true); assert.equal(modules[1].inert, true);
  assert.equal(list.dataset.visibleCount, '4'); assert.equal(list.dataset.pageCount, '3');
  assert(list.children.slice(4).every(item => item.hidden && item.inert));
  const seen = [], pager = list.parentNode.querySelector('nav'), next = pager.querySelector('[data-viewport-action="next"]');
  for (;;) {
    seen.push(...list.children.filter(item => !item.hidden).map(item => item.dataset.viewportId));
    if (next.disabled) break;
    env.click(next);
  }
  assert.deepEqual(seen, Array.from({ length: 9 }, (_, index) => `uid-0-${index}`));
  assert.equal(env.messages.length, 2); assert.equal(env.document.activeElement.dataset.viewportAction, 'previous');
  const second = root.querySelectorAll('[data-viewport-action="module"]')[1];
  env.document.emit('keydown', { target: second, key: 'End' });
  assert.equal(modules[0].hidden, true); assert.equal(modules[1].hidden, false); assert.equal(env.document.activeElement, second);
  env.controller.destroy();
});

test('resize and keyed rerender keep the focused copy visible without selecting gameplay state', () => {
  const env = environment(); let root = env.scene();
  env.controller.refresh({ key: 'bag', root });
  let list = root.querySelector('[data-viewport-list]'), target = list.children[7].children[0];
  assert.equal(env.controller.revealElement(target, { focus: true }), true);
  assert.equal(list.dataset.page, '2'); assert.equal(env.document.activeElement, target);
  list.height = 80; env.window.emit('resize'); env.tick();
  assert.equal(list.dataset.page, '4'); assert.equal(target.closest('[hidden]'), null);
  // Model app.innerHTML replacement while retaining the same root container.
  const replacement = env.scene(); replacement.remove();
  root.children.forEach(child => { child.parentNode = null; }); root.children = [];
  while (replacement.children.length) root.append(replacement.children[0]);
  env.document.activeElement = env.document.body;
  env.controller.refresh({ key: 'bag', root });
  list = root.querySelector('[data-viewport-list]'); target = list.children[7].children[0];
  assert.equal(target.closest('[hidden]'), null); assert.equal(env.document.activeElement, target);
  assert.equal(env.controller.selectModule({ key: 'bag', moduleId: 'missing' }), false);
  env.controller.destroy();
});

test('nested surfaces retain independent ownership and revealElement opens every enclosing module', () => {
  const env = environment(), root = env.scene({ items: 1 }), inner = env.scene({ nested: true });
  root.querySelectorAll('[data-viewport-module]')[1].append(inner);
  env.controller.refresh({ key: 'world', root });
  assert.equal(root.querySelector('[data-viewport-module]').getAttribute('aria-labelledby').startsWith('viewport-'), true);
  const outerModules = root.children.filter(node => node.dataset.viewportModule !== undefined);
  assert.equal(root.querySelector('nav').children.length, 2, 'outer tabs must not flatten nested modules');
  const innerModules = inner.children.filter(node => node.dataset.viewportModule !== undefined);
  const target = innerModules[1].querySelector('[data-viewport-list]').children[8].children[0];
  assert.equal(env.controller.revealElement(target, { focus: true }), true);
  assert.equal(outerModules[1].hidden, false); assert.equal(innerModules[1].hidden, false);
  assert.equal(target.closest('[hidden]'), null); assert.equal(env.document.activeElement, target);
  assert.equal(env.controller.selectModule({ key: 'world', surfaceId: 'scene', moduleId: 'module-0' }), true);
  assert.equal(outerModules[1].hidden, true); assert.equal(innerModules[1].hidden, false);
  env.controller.destroy();
});

test('refresh is idempotent and destroy removes controls/observers/listeners while restoring original visibility', () => {
  const env = environment(), root = env.scene(), original = root.querySelectorAll('[data-viewport-module]');
  const firstList = original[0].querySelector('[data-viewport-list]'); firstList.children[0].inert = true;
  env.controller.refresh({ key: 'bag', root }); env.controller.refresh({ key: 'bag', root });
  assert.equal(root.querySelectorAll('[data-viewport-action="module"]').length, 2);
  assert.equal(root.querySelectorAll('[data-viewport-action="next"]').length, 2);
  assert.equal(firstList.children[0].inert, true);
  assert.equal(env.observers[0].disconnected, true);
  env.controller.destroy(); env.controller.destroy();
  assert.equal(root.querySelectorAll('[data-viewport-action]').length, 0);
  assert.equal(original[0].children[0], firstList); assert(original.every(module => !module.hidden && !module.inert));
  assert(firstList.children.every(item => !item.hidden)); assert.equal(firstList.children[0].inert, true);
  assert.equal(env.document.count(), 0); assert.equal(env.window.count(), 0); assert.equal(env.window.visualViewport.count(), 0); assert.equal(env.document.fonts.count(), 0);
  assert.equal(env.frames.size, 0); assert(env.observers.every(observer => observer.disconnected));
});

test('fallback identities are exposed for exact page coverage and removed again on cleanup', () => {
  const env = environment(), root = env.scene({ items: 3, modules: 1 }), list = root.querySelector('[data-viewport-list]');
  for (const item of list.children) delete item.dataset.viewportId;
  list.children[1].children[0].dataset.id = list.children[0].children[0].dataset.id;
  env.controller.refresh({ key: 'legacy-list', root });
  assert.deepEqual(list.children.map(item => item.dataset.viewportId), ['uid-0-0', 'uid-0-0/1', 'uid-0-2']);
  assert.equal(root.querySelector('nav').hidden, true, 'one module needs no redundant tab strip');
  env.controller.destroy();
  assert(list.children.every(item => !Object.hasOwn(item.dataset, 'viewportId')));
});

test('externally controlled surface and list visibility survives refresh and destroy', () => {
  const env = environment(), root = env.scene({ modules: 1 }), list = root.querySelector('[data-viewport-list]');
  root.hidden = true; root.inert = true; list.hidden = true; list.inert = true;
  env.controller.refresh({ key: 'pack', root });
  // Opening/box completion belongs to the pack controller, not pagination.
  root.hidden = false; root.inert = false; list.hidden = false; list.inert = false;
  env.controller.refresh({ key: 'pack', root });
  assert.equal(root.hidden, false); assert.equal(root.inert, false);
  assert.equal(list.hidden, false); assert.equal(list.inert, false);
  assert.equal(list.dataset.visibleCount, '4');
  root.hidden = true; list.hidden = true;
  env.controller.refresh({ key: 'pack', root });
  assert.equal(root.hidden, true); assert.equal(list.hidden, true);
  root.hidden = false; list.hidden = false;
  env.controller.destroy();
  assert.equal(root.hidden, false); assert.equal(list.hidden, false);
});

test('a direct list-item button keeps focus after keyed refresh, not just buttons nested inside cards', () => {
  const env = environment(), root = env.scene({ modules: 1 }), list = root.querySelector('[data-viewport-list]');
  for (const item of [...list.children]) {
    const control = item.children[0]; item.remove(); control.height = 80; list.append(control);
  }
  env.controller.refresh({ key: 'print-tabs', root });
  const target = list.children[7]; env.controller.revealElement(target, { focus: true });
  env.document.activeElement = env.document.body;
  env.controller.refresh({ key: 'print-tabs', root });
  assert.equal(target.closest('[hidden]'), null); assert.equal(env.document.activeElement, target);
  env.controller.destroy();
});

test('a single unpaged battle table gets no tab strip and no pager, and every card stays visible', () => {
  const env = environment(), root = env.document.createElement('main');
  root.dataset.viewportSurface = 'battle'; env.document.body.append(root);
  const table = env.document.createElement('section'); table.dataset.viewportModule = 'table'; table.dataset.viewportLabel = '對局'; root.append(table);
  for (const side of ['opponent', 'player']) {
    const row = env.document.createElement('div'); table.append(row);
    for (let slot = 0; slot < 4; slot++) {
      const card = env.document.createElement('button'); card.dataset.action = side === 'player' ? 'select' : 'inspect'; card.dataset.id = `${side}-${slot}`; row.append(card);
    }
  }
  env.controller.refresh({ key: 'battle', root }); env.tick();
  assert.equal(root.querySelector('nav').hidden, true, 'one module never shows module tabs');
  assert.equal(root.querySelectorAll('[data-viewport-action="next"]').length + root.querySelectorAll('[data-viewport-action="previous"]').length, 0);
  assert.equal(table.hidden, false); assert.equal(table.inert, false);
  assert.equal(table.querySelectorAll('[data-action]').filter(card => card.closest('[hidden]')).length, 0);
  env.controller.destroy();
});
