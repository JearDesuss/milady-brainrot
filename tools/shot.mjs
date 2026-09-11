// Screenshot harness. Renders a URL at desktop and phone widths and writes PNGs.
//
//   node tools/shot.mjs <url> <outDir> [selector=name ...]
//
// Example:
//   python -m http.server 4181            (in the repo root, separate shell)
//   node tools/shot.mjs http://127.0.0.1:4181 output/shots .dresser=dresser .cast=cast
//
// Writes: desktop.png (1440 wide, full page), phone.png (520 wide, full page),
// and one PNG per selector=name pair at desktop width.
//
// Playwright is imported from the shared install that already exists on this
// machine (no node_modules in this repo); override with PLAYWRIGHT_DIR.
// The bundled headless shell may be missing for the installed browser build,
// so Chrome is launched from an explicit executablePath (override with CHROME_EXE).

import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const PW_DIR =
  process.env.PLAYWRIGHT_DIR ||
  'C:/Users/akbar/project sprint/X pseudonemous/tugou/node_modules/playwright';
const CHROME_EXE =
  process.env.CHROME_EXE ||
  'C:/Users/akbar/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

const pw = (await import(pathToFileURL(PW_DIR + '/index.js').href)).default;
const { chromium } = pw;

const [url, outDir, ...pairs] = process.argv.slice(2);
if (!url || !outDir) {
  console.error('usage: node tools/shot.mjs <url> <outDir> [selector=name ...]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME_EXE });
const errors = [];

async function shoot(width, height, file, selectors) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`[${width}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${width}] console.error: ${m.text()}`);
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/${file}`, fullPage: true });
  for (const pair of selectors) {
    const [sel, name] = pair.split('=');
    const el = await page.$(sel);
    if (el) await el.screenshot({ path: `${outDir}/${name || sel.replace(/[^a-z0-9]+/gi, '_')}.png` });
    else errors.push(`[${width}] selector not found: ${sel}`);
  }
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
  }));
  console.log(`${file}: ${overflow.clientWidth}x${overflow.height}` +
    (overflow.scrollWidth > overflow.clientWidth ? `  HORIZONTAL OVERFLOW ${overflow.scrollWidth}` : ''));
  await page.close();
}

await shoot(1440, 900, 'desktop.png', pairs);
await shoot(520, 900, 'phone.png', []);
await browser.close();

if (errors.length) {
  console.log('page errors:');
  for (const e of errors) console.log('  ' + e);
  process.exit(1);
}
console.log('ok');
