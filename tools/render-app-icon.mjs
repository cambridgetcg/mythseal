// tools/render-app-icon.mjs
/** Renders the store icon and splash sources from assets/mark.svg (the in-game brand mark)
 * into resources/, for @capacitor/assets. Re-run after the mark changes. */
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Inlined: a setContent page (about:blank) may not load file:// images.
const mark = `data:image/svg+xml;base64,${(await readFile(new URL('../assets/mark.svg', import.meta.url))).toString('base64')}`;
const out = fileURLToPath(new URL('../resources/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await engines.chromium.launch({ executablePath: chrome });
// The mark carries its own #10251e tile; filling the square with the same green lets the
// icon run edge to edge (each OS applies its own corner mask) and the splash sit on it.
const GROUND = '#10251e';
for (const [name, size, markShare] of [['icon.png', 1024, 1], ['splash.png', 2732, 0.22]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${GROUND}"><img src="${mark}" style="width:${Math.round(size * markShare)}px;height:auto;display:block"></body>`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${out}${name}` });
  await page.close();
}
await browser.close();
console.log('Rendered resources/icon.png (1024) and resources/splash.png (2732) from assets/mark.svg');
