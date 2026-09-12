# Milady Brainrot

Individual image assets for a composable NFT collection. Seven recognizable brainrot bases, eight separate accessories/effects, and two backgrounds. Website implementation is left to Opus.

## Start here, Opus

Read `asset-manifest.json`. Every path is relative to this folder. Use the original PNGs; they are not contact sheets.

- Canvas: 1254 × 1254.
- Draw order: background → back → base → headwear → face → effect.
- Base and background images cover the full canvas.
- Accessories use the manifest's `sourceRect` and per-character `placements` rectangles. All rectangles are [x, y, width, height] in pixels.
- Use Canvas `drawImage(image, ...sourceRect, ...destinationRect)`. Scale the whole composition uniformly if exporting another resolution.
- Pick one base, one background, at most one headwear item, and optionally one item from each other slot.
- Check `compatibleBases`. Wings are excluded for the shark and aircraft silhouettes.
- A missing optional trait means no layer; no blank PNG is necessary.
- Faces, intrinsic anatomy, sneakers, tutu, sandals, banana peel, and aircraft parts belong to the base. They are not separately swappable in this pack.
- `previews/` contains compositions made from these exact files and placements for visual verification.
- `thumbRect` and `paleArt` are optional picker hints for the site's thumbnails; they never affect compositing.

## Files

`bases/`: Tralalero Tralala, Ballerina Cappuccina, Bombardiro Crocodilo, Brr Brr Patapim, Lirili Larila, Chimpanzini Bananini, Tung Tung Tung Sahur.

`traits/headwear/`: pink lace bow, black lace bow, blue butterfly clip, pixel halo, silver tiara.

- `traits/back/`: angel wings.
- `traits/face/`: pink heart cheek sticker.
- `traits/effect/`: sparkle aura.
- `backgrounds/`: dream hills, lavender bedroom.

`references/original-wooden-concepts.png` preserves the earlier wooden character sheet. It is a flattened visual reference; use `bases/tung-tung-tung-sahur.png` with the separate traits for compositing.

`alpha-audit.json` records transparency counts, source bounds and SHA-256 hashes. Transparent means alpha 0; solid means alpha at least 240; source bounds use alpha above 16 to exclude near-invisible speckles. All 15 base/trait originals have a real alpha channel; both backgrounds are opaque. `generation-prompts.json` contains the final prompts.

## Generation

All source artwork was generated with the built-in image generator. Its model selector is not exposed, so GPT Image 2.5 could not be selected or verified. The files are Milady-vibe reinterpretations of existing brainrot character concepts, not official collection assets. Character identities were checked against [AP's overview](https://apnews.com/article/7600d1faea12be53609f3c2092e02eb7) and [the character overview](https://en.wikipedia.org/wiki/Italian_brainrot).

## Site

`index.html`, `style.css` and `app.js` at this folder's root are the whole site: no build step, no dependencies, no web fonts. Serve the folder over http (`python -m http.server 4181`); `file://` taints the canvas and export stops working. `app.js` fetches `asset-manifest.json` at runtime and takes every id, name, path, rectangle, placement and compatibility list from it.

The preview canvas is the native 1254 × 1254 square, scaled with CSS; Download PNG exports that same canvas, so the picture on the page and the file are the same pixels. Thumbnails, the hero and the compositor reference each PNG by its manifest path with no query string, so each file is downloaded once.

### Page API

`window.__milady` is set as soon as `app.js` runs:

| Member | Meaning |
| --- | --- |
| `ready` | Promise that resolves once the manifest is loaded and the initial recipe is drawn. |
| `manifest` | The parsed `asset-manifest.json` (null until `ready`). |
| `getRecipe()` | `{ base, background, traits: string[] }`; traits are in layer order. |
| `setRecipe(recipe)` | Applies a recipe to the controls and the preview, drops unknown or incompatible traits (the status line says which), keeps one item per slot, and writes `location.hash`. |
| `compose(recipe)` | Resolves to a **new** 1254 × 1254 canvas. Throws on an unknown id, a trait whose `compatibleBases` excludes the base, or two traits in one slot. |

`test/composite-check.mjs <http url>` checks the compositor against `previews/*.png`; `tools/shot.mjs` renders screenshots. Both import Playwright from the shared install named at the top of each file.

### Recipe link

The recipe lives in the hash: `#base=<base id>&background=<background id>&traits=<trait id>,<trait id>` (the `traits` part is omitted when there are none). Example:

    #base=chimpanzini-bananini&background=lavender-bedroom&traits=angel-wings,pink-lace-bow,pink-heart-sticker

It is read on load and rewritten with `history.replaceState` on every change, so a link opens the same look. Section links (`#dressing-room`, `#cast`, `#about`) scroll in place without touching the hash; a hash that is not a recipe leaves the default recipe (the manifest's first example) in place.

The pocket album is `localStorage` only (`milady-brainrot.album.v1`): a list of `{ id, savedAt, recipe, thumb }`, where `thumb` is a small JPEG data URL of the saved look. Nothing leaves the browser.
