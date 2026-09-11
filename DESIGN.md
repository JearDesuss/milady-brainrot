# Milady Brainrot — design contract

## North star
A forgotten dress-up website glowing on a bedroom CRT beside a pile of lace ribbons.

Theme: light. Audience: brainrot and internet-doll collectors. The page's job is to turn an odd little character into a personal avatar and let its owner take it home.

## Direction
An image-led dress-up clubhouse, with the odd sincerity of an old personal homepage. A broad landscape masthead leads to a functional dressing-room window. A horizontal cast shelf shows every character. A small scrapbook explains the world through images and captions. The site is neither a trading dashboard nor a simulated mint.

## Colors and surfaces
| Name | Hex | Use |
|---|---|---|
| Night ink | #282536 | Main text |
| Dust ink | #5e5a6c | Supporting text |
| Window line | #8794a4 | Frame edges |
| Quiet line | #bcc7d0 | Dividers |
| CRT mist | #d5e4ed | Page canvas, level 0 |
| Cloud blue | #e3edf3 | Recessed controls, level 1 |
| Wallpaper | #eeedf2 | Secondary panel, level 1 |
| Linen | #f4f2ec | Window contents, level 2 |
| Glass white | #fffefb | Raised control highlights, level 3 |
| Ribbon pink | #b74378 | Primary action and selected state only |
| Sage | #596e55 | Status dots and character tags only |
| Lilac | #74668e | Supporting tags only |

Elevation: one-pixel beveled window borders, restrained offset shadow on large windows only. No soft floating card shadows. Images bring the color.

## Typography and scale
Georgia italic (substitute Times New Roman italic): masthead and section titles, weights 400 only, normal figures. Verdana (substitute Tahoma, sans-serif): controls and prose, weights 400/700. Courier New (substitute monospace): image IDs and collection counts only, never marketing headlines.
| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Masthead | clamp(64px,9vw,128px) | 400 | .86 | -.045em |
| Section | clamp(36px,5vw,64px) | 400 | 1.02 | -.025em |
| Window title | 16px | 700 | 1.3 | -.02em |
| Lead | 18px | 400 | 1.6 | -.015em |
| Body | 14px | 400 | 1.65 | 0 |
| Control | 13px | 700 | 1.4 | -.015em |
| Caption | 12px | 400 | 1.5 | 0 |
| Micro | 10px | 400 | 1.5 | .04em |

## Spacing and shape
4px base. Element gap 8px. Panel padding 24px. Section gap 80px. Page max width 1320px. Only radii: 2px controls, 8px image corners, 999px small tags. Spacing tokens 4,8,12,16,24,32,40,48,64,80,96. Frames 1px and 3px. Avatar preview remains square. Minimum touch control 44px; compact desktop controls may be visually smaller but retain adequate hit areas.

## Layout
Top navigation resembles a personal-site directory with a small flower glyph and text links. Hero has a large serif identity at left, a real landscape, and three intentionally positioned transparent characters at right. A small caption sits along the bottom like a printed photograph. Main dressing-room window uses a 5:4 two-column desktop grid: large square live artwork at left, compact trait selector at right. On mobile, preview precedes controls and category tabs scroll horizontally. Cast shelf is a row of portraits with names, never a wall of feature cards. A short note and a final return-to-dressing-room link close the page.

## Imagery
Actual generated collection assets, correct transparent alpha, real scene backgrounds. Avoid baked checkerboards. Hero world image is decorative; all content/controls are real HTML. Never bake site text into the hero. Show original compositions, not generic placeholders. Tiny site-art symbols may use Unicode or CSS; no hand-authored SVG illustration.

## Components
- Directory navigation: anchors to dressing room, cast, and about.
- Masthead landscape: broad world image and transparent character collage; identity and one primary CTA.
- Dressing room: window frame containing live layered artwork, character selector, trait categories, and selectable thumbnails.
- Take-home bar: shuffle, download PNG, copy recipe link, save locally.
- Pocket album: locally saved looks with remove and reload controls; explicitly device-local.
- Cast shelf: accessible select-character buttons with actual art and short character-specific notes.
- About note: concise creative premise; no supply promises, token prices, roadmap fiction or pretend mint controls.
- Status message: polite live-region feedback for export/copy/save/errors.

## Do
1. Let the seven distinct silhouettes stay visible; they are the project's identity.
2. Use actual source rectangles and compatibility rules so dressed previews equal exports.
3. Keep actions in plain language; visitors should understand what they receive.
4. Treat transparency as data; preserve alpha and source hashes.
5. Keep all dressing-room controls keyboard accessible.
6. Honor reduced motion; motion is limited to quick button feedback.
7. Keep local saved looks on this device and label them that way.

## Don't
1. Do not invent an NFT mint, wallet connection, contract, supply or price.
2. Do not use a generic SaaS card grid; the primary surface is the dresser.
3. Do not put decorative code, fake counters or system jargon into copy.
4. Do not change source artwork when composing a look.
5. Do not offer incompatible traits without an explanation.
6. Do not use perpetual marquee motion or autoplay audio.
7. Do not add new visual tokens to fix one component; update this vocabulary first.

## Custom sections
Dressing room: make a look and export its exact PNG and recipe.
The residents: an introduction to seven recognizably different brainrot characters, including Tung Tung Tung Sahur.
A place to be a little strange: a small illustrated note about the collection's deadpan internet-doll world.

