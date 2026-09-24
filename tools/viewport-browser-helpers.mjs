/** Test navigation only: expose content through the same tabs/pages as a player. */
import assert from 'node:assert/strict';
const originals = new WeakMap();

// Existing timing fixtures deliberately pause browser RAF. Controller tab/page
// commits are synchronous; bound the optional paint wait using the Node clock.
export const viewportFrames = async page => {
  let timer;
  try {
    await Promise.race([
      page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
      new Promise(resolve => { timer = setTimeout(resolve, 100); }),
    ]);
  } finally { clearTimeout(timer); }
};

export async function revealViewportItem(page, locator) {
  locator = originals.get(locator) || locator;
  await locator.waitFor({ state: 'attached' });
  const module = await locator.evaluate(node => node.closest('[data-viewport-module]')?.dataset.viewportModule);
  const surface = locator.locator('xpath=ancestor::*[@data-viewport-surface][1]');
  if (module && await surface.count()) {
    const tab = surface.locator(`[data-viewport-action="module"][data-viewport-target="${module}"]`);
    if (await tab.count() && await tab.getAttribute('aria-selected') !== 'true') {
      await tab.click(); await viewportFrames(page);
    }
  }
  const list = locator.locator('xpath=ancestor::*[@data-viewport-list][1]');
  if (await list.count()) {
    const id = await list.getAttribute('data-viewport-list');
    // Pagination owns the direct item's hidden attribute. A CSS reveal may
    // still be transitioning visibility after the item reaches its page.
    const offPage = () => locator.evaluate(node => {
      const list = node.closest('[data-viewport-list]');
      for (let item = node; item && item !== list; item = item.parentElement) {
        if (item.parentElement === list) return item.hidden;
      }
      return false;
    });
    const previous = surface.locator(`[data-viewport-action="previous"][data-viewport-list-id="${id}"]`);
    const next = surface.locator(`[data-viewport-action="next"][data-viewport-list-id="${id}"]`);
    for (let pageNumber = 0; pageNumber < 1000 && await offPage(); pageNumber++) {
      if (await previous.count() && await previous.isEnabled()) { await previous.click(); await viewportFrames(page); }
      else break;
    }
    for (let pageNumber = 0; pageNumber < 1000 && await offPage(); pageNumber++) {
      assert(await next.count() && await next.isEnabled(), `No player route to ${await locator.getAttribute('data-id') || await locator.getAttribute('data-action')}`);
      await next.click(); await viewportFrames(page);
    }
  }
  await locator.waitFor({ state: 'visible' });
  return locator;
}

export async function clickViewportItem(page, locator, options) {
  await revealViewportItem(page, locator);
  await locator.click(options);
  await viewportFrames(page);
}

export async function visibleViewportIds(list) {
  return list.locator(':scope > [data-viewport-id]').filter({ visible: true }).evaluateAll(nodes => nodes.map(node => node.dataset.viewportId));
}

/** Existing scenario suites keep their business assertions; UI actions take real page routes. */
export function installViewportNavigation(page) {
  const build = new Set(['locator', 'filter', 'first', 'last', 'nth', 'getByRole', 'getByText', 'getByLabel', 'getByTestId']);
  const act = new Set(['click', 'dblclick', 'fill', 'check', 'uncheck', 'setChecked', 'selectOption', 'focus', 'press', 'hover', 'scrollIntoViewIfNeeded']);
  const cache = new WeakMap();
  function wrap(locator) {
    if (cache.has(locator)) return cache.get(locator);
    const adapted = new Proxy(locator, { get(target, key) {
      const value = Reflect.get(target, key);
      if (typeof value !== 'function') return value;
      if (build.has(key)) return (...args) => wrap(value.apply(target, args));
      if (act.has(key)) return async (...args) => {
        await revealViewportItem(page, target);
        return value.apply(target, args);
      };
      if (key === 'waitFor') return async options => {
        if (!options?.state || options.state === 'visible') await revealViewportItem(page, target);
        return value.call(target, options);
      };
      return value.bind(target);
    } });
    originals.set(adapted, locator); cache.set(locator, adapted); return adapted;
  }
  for (const key of ['locator', 'getByRole', 'getByText', 'getByLabel', 'getByTestId']) {
    const original = page[key].bind(page); page[key] = (...args) => wrap(original(...args));
  }
}
