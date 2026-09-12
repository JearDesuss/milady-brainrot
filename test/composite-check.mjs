// Contract test for the dressing room compositor.
//
//   node test/composite-check.mjs http://127.0.0.1:4190
//
// Needs the site served over http (file:// taints the canvas). The page must
// expose `window.__milady` — see README "Page API". Checks:
//   1. every example recipe in asset-manifest.json, composed by the page,
//      matches the shipped previews/*.png (mean abs RGB diff per channel < 3,
//      < 1% of channel samples off by more than 40);
//   2. compose() rejects a trait whose compatibleBases excludes the base;
//   3. compose() with no traits works (background + base only);
//   4. the recipe survives a hash round-trip through a real page reload
//      (via about:blank, so the hash-on-load path runs, not a fragment jump);
//   5. the #preview canvas that Download PNG exports produces a real PNG
//      (canvas is not tainted);
//   6. #preview's pixels match compose(getRecipe()) with the step-1 thresholds,
//      so the picture on the page is the file.

import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PW_DIR =
  process.env.PLAYWRIGHT_DIR ||
  'C:/Users/akbar/project sprint/X pseudonemous/tugou/node_modules/playwright';
const CHROME_EXE =
  process.env.CHROME_EXE ||
  'C:/Users/akbar/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

const base = process.argv[2];
if (!base) { console.error('usage: node test/composite-check.mjs <http url>'); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, '..', 'asset-manifest.json'), 'utf8'));

const pw = (await import(pathToFileURL(PW_DIR + '/index.js').href)).default;
const browser = await pw.chromium.launch({ executablePath: CHROME_EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

let failures = 0;
const fail = (msg) => { failures++; console.log('FAIL ' + msg); };
const pass = (msg) => console.log('ok   ' + msg);

await page.goto(base + '/', { waitUntil: 'networkidle' });
const hasApi = await page.evaluate(() => typeof window.__milady === 'object' && window.__milady !== null);
if (!hasApi) { fail('window.__milady is missing'); await browser.close(); process.exit(1); }
await page.evaluate(() => window.__milady.ready);

// 1. examples vs previews
const results = await page.evaluate(async (examples) => {
  const api = window.__milady;
  const out = [];
  for (const ex of examples) {
    const t0 = performance.now();
    const canvas = await api.compose({ base: ex.base, background: ex.background, traits: ex.traits });
    const ms = performance.now() - t0;
    const img = new Image();
    img.src = ex.path;
    await img.decode();
    const ref = document.createElement('canvas');
    ref.width = 1254; ref.height = 1254;
    ref.getContext('2d').drawImage(img, 0, 0);
    const a = canvas.getContext('2d').getImageData(0, 0, 1254, 1254).data;
    const b = ref.getContext('2d').getImageData(0, 0, 1254, 1254).data;
    let sum = 0, max = 0, bad = 0;
    for (let i = 0; i < a.length; i += 4) {
      for (let k = 0; k < 3; k++) {
        const d = Math.abs(a[i + k] - b[i + k]);
        sum += d; if (d > max) max = d; if (d > 40) bad++;
      }
    }
    const n = (a.length / 4) * 3;
    out.push({
      id: ex.base, w: canvas.width, h: canvas.height, ms: Math.round(ms),
      mean: +(sum / n).toFixed(3), max, badPct: +((bad / n) * 100).toFixed(3),
    });
  }
  return out;
}, manifest.examples);

for (const r of results) {
  const sizeOk = r.w === 1254 && r.h === 1254;
  const ok = sizeOk && r.mean < 3 && r.badPct < 1;
  (ok ? pass : fail)(`example ${r.id}: ${r.w}x${r.h} mean=${r.mean} max=${r.max} bad=${r.badPct}% (${r.ms}ms)`);
}

// 2. incompatible trait is rejected
const rejected = await page.evaluate(async () => {
  try { await window.__milady.compose({ base: 'tralalero-tralala', background: 'dream-hills', traits: ['angel-wings'] }); return false; }
  catch (e) { return true; }
});
(rejected ? pass : fail)('compose() rejects angel-wings on tralalero-tralala');

// 3. no traits
const bare = await page.evaluate(async () => {
  const c = await window.__milady.compose({ base: 'lirili-larila', background: 'lavender-bedroom', traits: [] });
  return c.width === 1254 && c.height === 1254;
});
(bare ? pass : fail)('compose() with no traits');

// 4. recipe hash round-trip through a reload
const recipe = { base: 'chimpanzini-bananini', background: 'lavender-bedroom', traits: ['angel-wings', 'pink-lace-bow', 'pink-heart-sticker'] };
await page.evaluate((r) => { window.__milady.setRecipe(r); }, recipe);
const hash = await page.evaluate(() => location.hash);
if (!hash || hash.length < 5) fail('setRecipe() did not write a recipe into location.hash');
await page.goto('about:blank'); // a same-document fragment navigation would keep the old page alive
await page.goto(base + '/' + hash, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__milady.ready);
const back = await page.evaluate(() => window.__milady.getRecipe());
const same = back && back.base === recipe.base && back.background === recipe.background &&
  JSON.stringify([...(back.traits || [])].sort()) === JSON.stringify([...recipe.traits].sort());
(same ? pass : fail)(`recipe round-trip via ${hash} -> ${JSON.stringify(back)}`);

// 5. the exported canvas (#preview, what Download PNG serialises) is a real PNG
const pngLen = await page.evaluate(() => document.getElementById('preview').toDataURL('image/png').length);
(pngLen > 100000 ? pass : fail)(`#preview PNG data URL length ${pngLen}`);

// 6. #preview shows the same pixels compose() produces for the current recipe
const previewDiff = await page.evaluate(async () => {
  const api = window.__milady;
  const c = await api.compose(api.getRecipe());
  const p = document.getElementById('preview');
  if (p.width !== c.width || p.height !== c.height) return { sizeOk: false, w: p.width, h: p.height };
  const a = p.getContext('2d').getImageData(0, 0, p.width, p.height).data;
  const b = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let sum = 0, max = 0, bad = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(a[i + k] - b[i + k]);
      sum += d; if (d > max) max = d; if (d > 40) bad++;
    }
  }
  const n = (a.length / 4) * 3;
  return { sizeOk: true, w: p.width, h: p.height, mean: +(sum / n).toFixed(3), max, badPct: +((bad / n) * 100).toFixed(3) };
});
{
  const r = previewDiff;
  const ok = r.sizeOk && r.mean < 3 && r.badPct < 1;
  (ok ? pass : fail)(`#preview vs compose(): ${r.w}x${r.h} mean=${r.mean} max=${r.max} bad=${r.badPct}%`);
}

if (pageErrors.length) { for (const e of pageErrors) fail('page error: ' + e); }

await browser.close();
console.log(failures ? `${failures} failure(s)` : 'all checks passed');
process.exit(failures ? 1 : 0);
