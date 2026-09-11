/* Milady Brainrot — dressing room.
 *
 * asset-manifest.json is the single source of truth: ids, names, paths,
 * source rectangles, placements, compatibility and examples all come from it.
 * Nothing about the artwork is hardcoded here. See README "Site" for the page
 * API (window.__milady) and the recipe hash format.
 */
(() => {
  'use strict';

  const MANIFEST_URL = 'asset-manifest.json';
  const STORAGE_KEY = 'milady-brainrot.album.v1';
  const THUMB_PX = 160;

  // Copy only. Names come from the manifest.
  const NOTES = {
    'tralalero-tralala': 'A shark in three blue sneakers. Does not swim any more and does not miss it.',
    'ballerina-cappuccina': 'Her head is a cappuccino, foam art included. Stays on pointe even when resting.',
    'bombardiro-crocodilo': 'A crocodile that is also a small aircraft. Wings are not offered; it has some.',
    'brr-brr-patapim': 'A forest creature with a considerable nose and moss on the shoulders. Rarely blinks.',
    'lirili-larila': 'A cactus elephant in sandals. Will accept a butterfly clip on either ear.',
    'chimpanzini-bananini': 'A green monkey inside a banana, or the other way around. Looks up a lot.',
    'tung-tung-tung-sahur': 'A wooden post with a face. The oldest resident here, and the calmest.',
  };

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- state ----------

  const state = {
    manifest: null,
    byId: new Map(),        // id -> base | background | trait record
    slots: [],              // optional trait slots, in layer order
    recipe: null,           // {base, background, traits[]}
    images: new Map(),      // path -> Promise<HTMLImageElement>
    drawToken: 0,
    activeTab: null,
    lastHash: '',
    album: [],
  };

  let resolveReady, rejectReady;
  const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
  ready.catch(() => {}); // a boot failure is reported in the status line, not the console

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v === false || v == null) continue;
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) if (c) node.append(c);
    return node;
  };

  // ---------- images ----------

  function loadImage(path) {
    if (state.images.has(path)) return state.images.get(path);
    const p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load ' + path));
      img.src = path; // manifest path, no query string: one cached download per file
    });
    state.images.set(path, p);
    return p;
  }

  // ---------- recipe rules ----------

  const traitsOf = () => state.manifest.traits;
  const basesOf = () => state.manifest.bases;
  const backgroundsOf = () => state.manifest.backgrounds;

  function isCompatible(trait, baseId) {
    return Array.isArray(trait.compatibleBases) && trait.compatibleBases.includes(baseId)
      && !!(state.manifest.placements[baseId] && state.manifest.placements[baseId][trait.id]);
  }

  // Strict: throws on anything the manifest does not allow.
  function normalizeStrict(recipe) {
    if (!recipe || typeof recipe !== 'object') throw new Error('Recipe must be an object');
    const base = state.byId.get(recipe.base);
    if (!base || base.slot !== 'base') throw new Error('Unknown base: ' + recipe.base);
    const bg = state.byId.get(recipe.background);
    if (!bg || bg.slot !== 'background') throw new Error('Unknown background: ' + recipe.background);
    const seen = new Set();
    const traits = [];
    for (const id of recipe.traits || []) {
      const t = state.byId.get(id);
      if (!t || !state.slots.includes(t.slot)) throw new Error('Unknown trait: ' + id);
      if (!isCompatible(t, base.id)) throw new Error(t.name + ' is not made for ' + base.name);
      if (seen.has(t.slot)) throw new Error('Only one ' + t.slot + ' item at a time');
      seen.add(t.slot);
      traits.push(t);
    }
    traits.sort((a, b) => state.slots.indexOf(a.slot) - state.slots.indexOf(b.slot));
    return { base: base.id, background: bg.id, traits: traits.map((t) => t.id) };
  }

  // Lenient: keeps what it can, drops the rest, reports what was dropped.
  function normalizeLenient(recipe) {
    const current = state.recipe || defaultRecipe();
    const r = recipe && typeof recipe === 'object' ? recipe : {};
    const base = state.byId.get(r.base);
    const baseId = base && base.slot === 'base' ? base.id : current.base;
    const bg = state.byId.get(r.background);
    const bgId = bg && bg.slot === 'background' ? bg.id : current.background;
    const seen = new Set();
    const traits = [];
    const dropped = [];
    for (const id of Array.isArray(r.traits) ? r.traits : []) {
      const t = state.byId.get(id);
      if (!t || !state.slots.includes(t.slot)) continue;
      if (seen.has(t.slot)) continue;
      if (!isCompatible(t, baseId)) { dropped.push(t); continue; }
      seen.add(t.slot);
      traits.push(t);
    }
    traits.sort((a, b) => state.slots.indexOf(a.slot) - state.slots.indexOf(b.slot));
    return { recipe: { base: baseId, background: bgId, traits: traits.map((t) => t.id) }, dropped };
  }

  function defaultRecipe() {
    const ex = state.manifest.examples && state.manifest.examples[0];
    if (ex) return { base: ex.base, background: ex.background, traits: [...ex.traits] };
    return { base: basesOf()[0].id, background: backgroundsOf()[0].id, traits: [] };
  }

  // ---------- hash ----------
  // #base=<id>&background=<id>&traits=<id>,<id>

  function recipeToHash(recipe) {
    let h = '#base=' + recipe.base + '&background=' + recipe.background;
    if (recipe.traits.length) h += '&traits=' + recipe.traits.join(',');
    return h;
  }

  function hashToRecipe(hash) {
    if (!hash || hash.length < 2) return null;
    const params = new URLSearchParams(hash.slice(1));
    if (!params.has('base') && !params.has('background') && !params.has('traits')) return null;
    const traits = (params.get('traits') || '').split(',').map((s) => s.trim()).filter(Boolean);
    return { base: params.get('base'), background: params.get('background'), traits };
  }

  function writeHash(recipe) {
    const h = recipeToHash(recipe);
    state.lastHash = h;
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  // ---------- compositing ----------

  function layersFor(recipe) {
    const m = state.manifest;
    const base = state.byId.get(recipe.base);
    const bg = state.byId.get(recipe.background);
    const traits = recipe.traits.map((id) => state.byId.get(id));
    const layers = [];
    for (const slot of m.layerOrder) {
      if (slot === 'background') layers.push({ item: bg, dest: m.backgroundDestinationRect });
      else if (slot === 'base') layers.push({ item: base, dest: m.baseDestinationRect });
      else {
        const t = traits.find((x) => x.slot === slot);
        if (t) layers.push({ item: t, dest: m.placements[base.id][t.id] });
      }
    }
    return layers;
  }

  async function paint(ctx, recipe) {
    const layers = layersFor(recipe);
    const images = await Promise.all(layers.map((l) => loadImage(l.item.path)));
    const { width, height } = state.manifest.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    layers.forEach((l, i) => {
      const src = l.item.sourceRect;
      const dst = l.dest;
      ctx.drawImage(images[i], src[0], src[1], src[2], src[3], dst[0], dst[1], dst[2], dst[3]);
    });
  }

  async function compose(recipe) {
    if (!state.manifest) await ready;
    const r = normalizeStrict(recipe);
    const canvas = document.createElement('canvas');
    canvas.width = state.manifest.canvas.width;
    canvas.height = state.manifest.canvas.height;
    await paint(canvas.getContext('2d'), r);
    return canvas;
  }

  const preview = $('#preview');

  async function redraw() {
    const token = ++state.drawToken;
    const recipe = state.recipe;
    try {
      // paint into a scratch canvas so a slow load never shows a half-drawn look
      const scratch = document.createElement('canvas');
      scratch.width = preview.width; scratch.height = preview.height;
      await paint(scratch.getContext('2d'), recipe);
      if (token !== state.drawToken) return;
      const ctx = preview.getContext('2d');
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.drawImage(scratch, 0, 0);
    } catch (err) {
      if (token === state.drawToken) setStatus(err.message || 'The look could not be drawn.', true);
      throw err;
    }
  }

  // ---------- describing a look ----------

  const nameOf = (id) => (state.byId.get(id) || {}).name || id;

  function describe(recipe) {
    const base = nameOf(recipe.base);
    const room = nameOf(recipe.background).toLowerCase();
    const traits = recipe.traits.map((id) => state.byId.get(id));
    const worn = traits.filter((t) => t.slot !== 'effect' && t.slot !== 'back').map((t) => t.name.toLowerCase());
    const back = traits.find((t) => t.slot === 'back');
    const effect = traits.find((t) => t.slot === 'effect');
    let s = base + ' in the ' + room;
    if (worn.length) s += ', wearing ' + joinNames(worn);
    if (back) s += ', with ' + back.name.toLowerCase();
    if (effect) s += (back ? ' and ' : ', with ') + effect.name.toLowerCase();
    return s + '.';
  }
  function joinNames(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }

  function fileNameFor(recipe) {
    const parts = ['milady-brainrot', recipe.base, recipe.background, ...recipe.traits];
    return parts.join('_') + '.png';
  }

  // ---------- status ----------

  const statusEl = $('#status');
  let statusTimer = 0;
  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle('is-error', !!isError);
    statusEl.classList.toggle('has-text', !!text);
    clearTimeout(statusTimer);
    if (text) statusTimer = setTimeout(() => { statusEl.textContent = ''; statusEl.classList.remove('has-text', 'is-error'); }, 8000);
  }

  // ---------- selector UI ----------

  const thumbsBase = $('#thumbs-base');
  const thumbsBackground = $('#thumbs-background');
  const tabsEl = $('#tabs');
  const panelsEl = $('#panels');
  const thumbCanvases = new Map(); // item id -> {canvas, art}

  function makeThumb({ name, value, label, item, none }) {
    const input = el('input', { type: 'radio', name, value });
    const art = el('span', { class: 'thumb-art' + (none ? ' is-none' : ' is-loading'), 'aria-hidden': 'true' });
    if (none) art.textContent = 'none';
    else {
      const c = document.createElement('canvas');
      const wide = item.slot === 'background';
      c.width = wide ? Math.round(THUMB_PX * 1.5) : THUMB_PX; c.height = THUMB_PX;
      art.append(c);
      thumbCanvases.set(item.id, { canvas: c, art, item });
    }
    const why = el('span', { class: 'thumb-why' });
    const wrap = el('label', { class: 'thumb', 'data-id': value || '' }, [
      input, art, el('span', { class: 'thumb-name', text: label }), why,
    ]);
    wrap._input = input; wrap._why = why; wrap._item = item;
    return wrap;
  }

  function renderThumb(id) {
    const entry = thumbCanvases.get(id);
    if (!entry) return;
    const { canvas, art, item } = entry;
    loadImage(item.path).then((img) => {
      const [sx, sy, sw, sh] = item.sourceRect;
      const W = canvas.width, H = canvas.height;
      const cover = item.slot === 'background';
      const scale = cover ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
      const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
      const dx = Math.round((W - dw) / 2), dy = Math.round((H - dh) / 2);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      art.classList.remove('is-loading');
    }).catch(() => { art.classList.remove('is-loading'); art.classList.add('is-missing'); });
  }

  function buildSelector() {
    const m = state.manifest;

    for (const b of m.bases) {
      const t = makeThumb({ name: 'base', value: b.id, label: b.name, item: b });
      thumbsBase.append(t);
    }
    for (const g of m.backgrounds) {
      const t = makeThumb({ name: 'background', value: g.id, label: g.name, item: g });
      thumbsBackground.append(t);
    }

    for (const slot of state.slots) {
      const tabId = 'tab-' + slot, panelId = 'panel-' + slot;
      const tab = el('button', {
        type: 'button', class: 'tab', role: 'tab', id: tabId, 'aria-controls': panelId,
        'aria-selected': 'false', tabindex: '-1', 'data-slot': slot,
      });
      tab.append(el('span', { class: 'tab-label', text: capitalise(slot) }), document.createTextNode(' '), el('span', { class: 'tab-state', text: '' }));
      tab.addEventListener('click', () => selectTab(slot));
      tab.addEventListener('keydown', onTabKey);
      tabsEl.append(tab);

      const panel = el('div', { class: 'panel', role: 'tabpanel', id: panelId, 'aria-labelledby': tabId, hidden: true });
      const thumbs = el('div', { class: 'thumbs' });
      thumbs.append(makeThumb({ name: 'trait-' + slot, value: '', label: 'None', none: true }));
      for (const t of m.traits.filter((x) => x.slot === slot)) {
        thumbs.append(makeThumb({ name: 'trait-' + slot, value: t.id, label: t.name, item: t }));
      }
      panel.append(thumbs);
      panelsEl.append(panel);
    }

    $('.dresser-selector').addEventListener('change', onSelectorChange);
    selectTab(state.slots.includes('headwear') ? 'headwear' : state.slots[0]);
  }

  function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function selectTab(slot) {
    state.activeTab = slot;
    for (const tab of tabsEl.querySelectorAll('.tab')) {
      const on = tab.dataset.slot === slot;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    }
    for (const panel of panelsEl.querySelectorAll('.panel')) {
      panel.hidden = panel.id !== 'panel-' + slot;
    }
  }

  function onTabKey(e) {
    const tabs = [...tabsEl.querySelectorAll('.tab')];
    const i = tabs.indexOf(e.currentTarget);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    selectTab(tabs[next].dataset.slot);
    tabs[next].focus();
  }

  function onSelectorChange(e) {
    const input = e.target;
    if (!input || input.type !== 'radio') return;
    const r = { ...state.recipe, traits: [...state.recipe.traits] };
    if (input.name === 'base') r.base = input.value;
    else if (input.name === 'background') r.background = input.value;
    else if (input.name.startsWith('trait-')) {
      const slot = input.name.slice(6);
      r.traits = r.traits.filter((id) => (state.byId.get(id) || {}).slot !== slot);
      if (input.value) r.traits.push(input.value);
    }
    applyRecipe(r, { announceDrops: true });
  }

  // Reflect state.recipe into every control.
  function syncUI() {
    const r = state.recipe;
    const base = state.byId.get(r.base);
    for (const thumb of thumbsBase.querySelectorAll('.thumb')) thumb._input.checked = thumb._input.value === r.base;
    for (const thumb of thumbsBackground.querySelectorAll('.thumb')) thumb._input.checked = thumb._input.value === r.background;

    for (const slot of state.slots) {
      const chosen = r.traits.find((id) => state.byId.get(id).slot === slot) || '';
      const panel = $('#panel-' + slot);
      for (const thumb of panel.querySelectorAll('.thumb')) {
        const item = thumb._item;
        const ok = !item || isCompatible(item, r.base);
        thumb._input.disabled = !ok;
        thumb.classList.toggle('is-disabled', !ok);
        thumb._why.textContent = ok ? '' : 'Not made for ' + base.name + '.';
        thumb._input.checked = thumb._input.value === chosen;
      }
      const tab = $('#tab-' + slot);
      const stateEl = tab.querySelector('.tab-state');
      stateEl.classList.toggle('is-on', !!chosen);
      tab.setAttribute('aria-label', capitalise(slot) + (chosen ? ', ' + nameOf(chosen) : ', none'));
    }

    $('#window-title').textContent = 'dressing room — ' + base.name;
    $('#window-id').textContent = base.path;
    $('#stage-caption').textContent = describe(r);
    document.title = base.name + ' — Milady Brainrot';

    for (const btn of document.querySelectorAll('.resident')) {
      const on = btn.dataset.base === r.base;
      btn.classList.toggle('is-current', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function applyRecipe(recipe, { announceDrops = false, write = true } = {}) {
    const { recipe: r, dropped } = normalizeLenient(recipe);
    state.recipe = r;
    syncUI();
    if (write) writeHash(r);
    if (announceDrops && dropped.length) {
      setStatus(joinNames(dropped.map((t) => t.name)) + (dropped.length > 1 ? ' are' : ' is') + ' not made for ' + nameOf(r.base) + ', so it came off.');
    }
    return redraw();
  }

  // ---------- take-home bar ----------

  function shuffle() {
    const bases = basesOf(), bgs = backgroundsOf();
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const base = pick(bases).id;
    const traits = [];
    for (const slot of state.slots) {
      const options = traitsOf().filter((t) => t.slot === slot && isCompatible(t, base));
      if (!options.length) continue;
      const chance = slot === 'headwear' ? 0.85 : 0.5;
      if (Math.random() < chance) traits.push(pick(options).id);
    }
    applyRecipe({ base, background: pick(bgs).id, traits });
    setStatus('Shuffled. ' + describe(state.recipe));
  }

  function download() {
    const name = fileNameFor(state.recipe);
    try {
      preview.toBlob((blob) => {
        if (!blob) { setStatus('The PNG could not be made.', true); return; }
        const url = URL.createObjectURL(blob);
        const a = el('a', { href: url, download: name });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        setStatus('Saved ' + name + ' (' + preview.width + ' by ' + preview.height + ').');
      }, 'image/png');
    } catch (err) {
      setStatus('The PNG could not be made: ' + err.message, true);
    }
  }

  async function copyLink() {
    writeHash(state.recipe);
    const link = location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        setStatus('Recipe link copied.');
        return;
      }
      throw new Error('no clipboard');
    } catch (_) {
      const ta = el('textarea', { readonly: true, 'aria-hidden': 'true' });
      ta.value = link;
      ta.style.cssText = 'position:fixed;left:-1000px;top:0;';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_e) { ok = false; }
      ta.remove();
      setStatus(ok ? 'Recipe link copied.' : 'Copy this link by hand: ' + link, !ok);
    }
  }

  // ---------- pocket album ----------

  function loadAlbum() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      state.album = Array.isArray(list) ? list : [];
    } catch (_) { state.album = []; }
  }
  function storeAlbum() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.album)); return true; }
    catch (_) { return false; }
  }

  function saveToAlbum() {
    const r = state.recipe;
    const small = document.createElement('canvas');
    small.width = 144; small.height = 144;
    const ctx = small.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(preview, 0, 0, 144, 144);
    let thumb = '';
    try { thumb = small.toDataURL('image/jpeg', 0.82); } catch (_) { thumb = ''; }
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      savedAt: new Date().toISOString(),
      recipe: { base: r.base, background: r.background, traits: [...r.traits] },
      thumb,
    };
    state.album.unshift(entry);
    if (!storeAlbum()) { state.album.shift(); setStatus('This browser would not keep the look. Storage may be full or blocked.', true); return; }
    renderAlbum();
    setStatus('Saved to the pocket album on this device.');
  }

  function removeFromAlbum(id) {
    state.album = state.album.filter((e) => e.id !== id);
    storeAlbum();
    renderAlbum();
    setStatus('Removed from the pocket album.');
  }

  function renderAlbum() {
    const list = $('#album-list');
    list.textContent = '';
    for (const e of state.album) {
      const r = e.recipe || {};
      const known = state.byId.has(r.base) && state.byId.has(r.background);
      const when = e.savedAt ? new Date(e.savedAt) : null;
      const item = el('li', { class: 'album-item' }, [
        e.thumb ? el('img', { class: 'album-thumb', src: e.thumb, alt: '', width: 72, height: 72 }) : el('span', { class: 'album-thumb' }),
        el('div', { class: 'album-text' }, [
          el('strong', { text: known ? nameOf(r.base) : 'Unknown look' }),
          el('span', { text: known ? describe(normalizeLenient(r).recipe) : 'This look refers to files that are no longer here.' }),
          when ? el('span', { class: 'mono', text: 'saved ' + when.toLocaleDateString() + ' ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }) : null,
          el('div', { class: 'album-actions' }, [
            el('button', { type: 'button', class: 'button', text: 'Open', disabled: !known, onclick: () => { applyRecipe(r); setStatus('Opened from the pocket album.'); scrollTo('#dressing-room'); } }),
            el('button', { type: 'button', class: 'button', text: 'Remove', onclick: () => removeFromAlbum(e.id) }),
          ]),
        ]),
      ]);
      list.append(item);
    }
    $('#album-empty').hidden = state.album.length > 0;
    $('#album-count').textContent = state.album.length ? state.album.length + (state.album.length === 1 ? ' look' : ' looks') : '';
  }

  // ---------- cast shelf ----------

  function buildShelf() {
    const shelf = $('#shelf');
    const wingless = (id) => !traitsOf().some((t) => t.slot === 'back' && isCompatible(t, id));
    for (const b of basesOf()) {
      const btn = el('button', {
        type: 'button', class: 'resident', 'data-base': b.id, 'aria-pressed': 'false',
        onclick: () => {
          applyRecipe({ ...state.recipe, base: b.id }, { announceDrops: true });
          scrollTo('#dressing-room');
          setStatus(b.name + ' is in the dressing room.');
        },
      }, [
        el('img', { class: 'resident-art', 'data-src': b.path, alt: '' }),
        el('span', { class: 'resident-name', text: b.name }),
        el('span', { class: 'resident-note', text: NOTES[b.id] || '' }),
        el('span', { class: 'resident-tag' + (wingless(b.id) ? ' is-lilac' : ''), text: wingless(b.id) ? 'no wings' : 'fits wings' }),
      ]);
      shelf.append(el('li', {}, [btn]));
    }
  }

  // ---------- anchors that must not clobber the recipe hash ----------

  function scrollTo(sel) {
    const target = $(sel);
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    scrollTo('#' + id);
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === state.lastHash) return;
    const r = hashToRecipe(location.hash);
    if (r) applyRecipe(r, { write: false });
  });

  // ---------- boot ----------

  function indexManifest(m) {
    state.byId.clear();
    for (const b of m.bases) state.byId.set(b.id, b);
    for (const g of m.backgrounds) state.byId.set(g.id, g);
    for (const t of m.traits) state.byId.set(t.id, t);
    state.slots = m.layerOrder.filter((s) => s !== 'background' && s !== 'base');
  }

  function setDeferredSources(scopeSel) {
    for (const img of document.querySelectorAll(scopeSel + ' img[data-src]')) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
  }

  async function warmEverything() {
    // current recipe is drawn; hero is on its way; now the rest, one at a time.
    const m = state.manifest;
    const ordered = [];
    for (const b of m.bases) ordered.push(b);
    for (const g of m.backgrounds) ordered.push(g);
    for (const t of m.traits) ordered.push(t);
    const first = new Set([state.recipe.base, state.recipe.background, ...state.recipe.traits]);
    ordered.sort((a, b) => (first.has(b.id) ? 1 : 0) - (first.has(a.id) ? 1 : 0));
    for (const item of ordered) {
      try { await loadImage(item.path); } catch (_) { /* thumb shows missing */ }
      renderThumb(item.id);
    }
    setDeferredSources('#cast');
    setDeferredSources('#about');
  }

  async function boot() {
    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('asset-manifest.json could not be loaded (' + res.status + ')');
    const m = await res.json();
    state.manifest = m;
    api.manifest = m;
    indexManifest(m);

    $('#collection-count').textContent = m.bases.length + ' residents, ' + m.traits.length + ' items, ' + m.backgrounds.length + ' rooms';

    buildSelector();
    buildShelf();
    loadAlbum();
    renderAlbum();

    $('#btn-shuffle').addEventListener('click', shuffle);
    $('#btn-download').addEventListener('click', download);
    $('#btn-copy').addEventListener('click', copyLink);
    $('#btn-save').addEventListener('click', saveToAlbum);

    const fromHash = hashToRecipe(location.hash);
    const initial = fromHash || defaultRecipe();
    await applyRecipe(initial, { write: !!fromHash });
    if (!fromHash && location.hash && document.getElementById(location.hash.slice(1))) {
      state.lastHash = location.hash; // a section anchor; leave it alone
    }
    resolveReady();

    setDeferredSources('.masthead');
    warmEverything();
  }

  const api = {
    ready,
    manifest: null,
    getRecipe() {
      const r = state.recipe || { base: null, background: null, traits: [] };
      return { base: r.base, background: r.background, traits: [...r.traits] };
    },
    setRecipe(recipe) { applyRecipe(recipe, { announceDrops: true }); },
    compose,
  };
  window.__milady = api;

  boot().catch((err) => {
    setStatus(err.message || 'The dressing room could not open.', true);
    rejectReady(err);
  });
})();
