# VICE FRAME 2 — GTA-Style Cover Art Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/luckylawless1/vice-frame-2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/luckylawless1/vice-frame-2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos into GTA 6-style video game cover
art: multi-panel layouts, per-panel colour grades, a gradient masthead with
wanted stars, hand-drawn stickers and a caption bar — exported as a PNG in
square, portrait or landscape.

Open `app/index.html` in a desktop browser and start making covers. There
is no build step, no account and no network: every photo stays on your
machine.

## What it does

- **Layouts** — four panel arrangements: Cover Star (one hero + two small),
  Collage Four (2×2), Panel Grid (one wide + three below) and Crew Wide
  (three verticals).
- **Photos** — seven built-in samples (a neon boulevard, a pink convertible,
  a rooftop duo at dusk, a boardwalk, a pier, a yacht at sunset), plus your
  own: upload through the picker or drag files straight onto the cover.
  Click a panel to select it, click a photo to drop it in, drag inside a
  panel to pan, scroll or use the slider to zoom, and nudge with the arrow
  keys (Shift for bigger steps).
- **Grades** — per panel, or applied to all at once: Clean, Vice Sunset
  (warm), Neon Night (cool and saturated) and Ink Poster (posterized ink
  colours, darkened edges and a halftone screen for a hand-drawn print
  feel).
- **Words** — editable Tagline, Title and Caption. The title is set in
  Anton with a pink-to-teal gradient and auto-fits or wraps to two lines;
  the wanted-stars row is stacked below it with measured spacing, and the
  caption rides in a bar along the bottom.
- **Stickers** — original shapes drawn in code at render time: a palm tree
  silhouette, a starburst "NEW!" badge (always kept fully inside the
  frame), a retro striped sun and the wanted stars. Plus an optional film
  grain finish.
- **Export** — one click renders a true-size PNG: 1080×1080, 1080×1350 or
  1920×1080.

## Screenshots

The four images in `screenshots/` are renders of the app itself: the
landscape cover from the default preset (Panel Grid, the neon boulevard
under Neon Night), the editor with that preset loaded, a portrait Cover
Star, and a square Collage Four.

## Tech notes

- Plain static files under `app/` — HTML, CSS and ES modules, no framework,
  no bundler, no dependencies. Rendering is 2D canvas throughout.
- The two display fonts, Anton and Archivo Black, are vendored under
  `app/fonts/` and licensed under the SIL Open Font License (see the OFL
  texts beside them).
- No Rockstar artwork, logos, wordmarks or fonts are used or reproduced;
  the layout language is the generic multi-panel game-cover style, the
  stickers are drawn from scratch in `app/src/stickers.js`, and the sample
  photos were generated for this project.
- `main.ts` (Node 22, standard library only) hands the entry in: it copies
  `app/` and `screenshots/` to the output directory and writes
  `dossier.json` with the vendored `vendor/makefun-app.ts` library.
- `serve.ts` is a tiny local server for trying the app: `node serve.ts`.

## License

MIT — see `LICENSE`.
