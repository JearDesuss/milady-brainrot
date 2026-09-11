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
