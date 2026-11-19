// The cover renderer for VICE FRAME 2. renderCover paints a whole cover
// onto any 2d context at any size: photo panels with per-panel grades, the
// masthead (tagline, gradient title, wanted-stars row), the stickers and
// the caption bar, plus optional film grain.
//
// Masthead stacking is measured, not guessed: the tagline, the title lines
// (fitted, possibly two) and the stars row are laid out in order, each
// starting below the previous element's measured bottom plus a clear gap.
// The stars row in particular is placed from the title's real bottom, so it
// can never ride up over the title letters in any layout or export size.

import { LAYOUTS, SIZES, panelRects } from './layouts.js';
import { drawGraded } from './effects.js';
import { drawWantedStars, drawPalm, drawBurst, drawRetroSun } from './stickers.js';

export function clampPan(panel) {
  panel.panX = Math.max(-1, Math.min(1, panel.panX));
  panel.panY = Math.max(-1, Math.min(1, panel.panY));
  panel.zoom = Math.max(1, Math.min(3.2, panel.zoom));
}

// Where a panel's photo lands: cover-fit into the panel rect, scaled by the
// panel's zoom, then slid by panX / panY across the overflow (each in
// [-1, 1], 0 centred). The result may extend past the panel; callers clip.
export function photoTransform(panel, rect, img) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const rangeX = Math.max(0, dw - rect.w);
  const rangeY = Math.max(0, dh - rect.h);
  return {
    x: rect.x + (rect.w - dw) / 2 + (panel.panX * rangeX) / 2,
    y: rect.y + (rect.h - dh) / 2 + (panel.panY * rangeY) / 2,
    w: dw,
    h: dh,
  };
}

function anton(size) {
  return `${Math.round(size)}px Anton, "Archivo Black", sans-serif`;
}

function archivo(size) {
  return `${Math.round(size)}px "Archivo Black", Anton, sans-serif`;
}

// Split a title into two lines at the word break that best balances the
// measured widths. Returns [wholeTitle] when it has a single word.
export function splitTitle(ctx, title, maxW, size) {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [title];
  ctx.font = anton(size);
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || w < best.w) best = { lines: [a, b], w };
  }
  return best && best.w <= maxW * 1.15 ? best.lines : [title];
}

// Fit the title: shrink one line until it fits maxW; if it would get too
// small, split into two lines and shrink those instead.
export function fitTitle(ctx, title, maxW, W) {
  let size = W * 0.128;
  const minSize = W * 0.052;
  ctx.font = anton(size);
  while (size > minSize && ctx.measureText(title).width > maxW) {
    size -= 3;
    ctx.font = anton(size);
  }
  if (ctx.measureText(title).width <= maxW) return { lines: [title], size };
  const lines = splitTitle(ctx, title, maxW, size);
  if (lines.length === 2) {
    size = W * 0.118;
    ctx.font = anton(size);
    while (size > minSize && lines.some((l) => ctx.measureText(l).width > maxW)) {
      size -= 3;
      ctx.font = anton(size);
    }
  }
  return { lines, size };
}

// The masthead's measured geometry: everything the renderer (and the top
// scrim) needs to stack tagline, title and stars without overlap.
export function mastheadMetrics(ctx, W, H, state) {
  const tagSize = Math.max(13, H * 0.026);
  const tagBaseline = H * 0.066;
  const fitted = fitTitle(ctx, state.title || 'UNTITLED', W * 0.88, W);
  const lineH = fitted.size * 1.05;
  const titleTop = tagBaseline + tagSize * 0.95;
  const firstBaseline = titleTop + fitted.size * 0.82;
  const titleBottom = firstBaseline + (fitted.lines.length - 1) * lineH + fitted.size * 0.26;
  const starR = Math.max(11, H * 0.02);
  const starsTop = titleBottom + H * 0.026; // the clear gap under the title
  const starsBottom = starsTop + starR * 2;
  const bottom = state.stickers.stars ? starsBottom : titleBottom;
  return { tagSize, tagBaseline, ...fitted, lineH, firstBaseline, titleBottom, starR, starsTop, bottom };
}

let grainTile = null;
function makeGrainTile() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function drawPanels(ctx, W, H, state, images, opts) {
  const layout = LAYOUTS[state.layout] ?? LAYOUTS['panel-grid'];
  const rects = panelRects(state.layout, W, H);
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < layout.slots; i++) {
    const rect = rects[i];
    const panel = state.panels[i];
    if (!rect || !panel) continue;
    const img = images.get(panel.photo);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawGraded(ctx, img, photoTransform(panel, rect, img), panel.grade);
    } else {
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#1b2a6b');
      g.addColorStop(1, '#6b1b4d');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
    if (opts.selected === i) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, W * 0.0035);
      ctx.setLineDash([W * 0.012, W * 0.008]);
      ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      const label = `PANEL ${i + 1}`;
      ctx.font = archivo(Math.max(12, H * 0.02));
      const tw = ctx.measureText(label).width;
      ctx.fillRect(rect.x + 8, rect.y + 8, tw + 16, H * 0.036);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, rect.x + 16, rect.y + 8 + H * 0.018);
      ctx.restore();
    }
  }
  return rects;
}

export function captionHeight(H) {
  return Math.round(H * 0.082);
}

export function renderCover(ctx, W, H, state, images, opts = {}) {
  const metrics = mastheadMetrics(ctx, W, H, state);
  drawPanels(ctx, W, H, state, images, opts);

  // Vignette to seat the artwork.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Top scrim under the masthead text, sized from the measured masthead.
  const scrimH = metrics.bottom + H * 0.05;
  const sg = ctx.createLinearGradient(0, 0, 0, scrimH);
  sg.addColorStop(0, 'rgba(2, 2, 10, 0.66)');
  sg.addColorStop(0.75, 'rgba(2, 2, 10, 0.38)');
  sg.addColorStop(1, 'rgba(2, 2, 10, 0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, scrimH);

  const capH = captionHeight(H);
  const capTop = H - capH;
  const inset = Math.max(28, W * 0.024); // starburst inset: never under 24 px

  // Stickers that sit under the masthead text.
  if (state.stickers.sun) {
    const r = W * 0.045;
    drawRetroSun(ctx, inset + r, inset + r, r);
  }
  if (state.stickers.palm) {
    drawPalm(ctx, W * 0.022, capTop + 2, H * 0.27);
  }

  // Masthead: tagline, then the gradient title, then the stars row below it.
  ctx.save();
  ctx.textAlign = 'center';
  try {
    ctx.letterSpacing = `${Math.round(metrics.tagSize * 0.3)}px`;
  } catch {
    /* older engines: no letter spacing, still fine */
  }
  ctx.font = archivo(metrics.tagSize);
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = metrics.tagSize * 0.35;
  ctx.shadowOffsetY = 2;
  ctx.fillText((state.tagline || '').toUpperCase(), W / 2, metrics.tagBaseline);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    /* ignore */
  }

  const grad = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
  grad.addColorStop(0, '#ff5da2');
  grad.addColorStop(0.52, '#c86bff');
  grad.addColorStop(1, '#2ee6c8');
  ctx.font = anton(metrics.size);
  ctx.lineJoin = 'round';
  metrics.lines.forEach((line, i) => {
    const y = metrics.firstBaseline + i * metrics.lineH;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = metrics.size * 0.12;
    ctx.shadowOffsetY = metrics.size * 0.04;
    ctx.strokeStyle = '#150a10';
    ctx.lineWidth = metrics.size * 0.055;
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = grad;
    ctx.fillText(line, W / 2, y);
  });
  ctx.restore();

  if (state.stickers.stars) {
    drawWantedStars(ctx, W / 2, metrics.starsTop, metrics.starR);
  }

  // Caption bar along the bottom.
  ctx.save();
  ctx.fillStyle = 'rgba(4, 4, 10, 0.94)';
  ctx.fillRect(0, capTop, W, capH);
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#ff5da2');
  accent.addColorStop(1, '#2ee6c8');
  ctx.fillStyle = accent;
  ctx.fillRect(0, capTop, W, Math.max(3, H * 0.004));
  let capSize = H * 0.034;
  ctx.font = archivo(capSize);
  const capText = (state.caption || '').toUpperCase();
  while (capSize > 10 && ctx.measureText(capText).width > W * 0.92) {
    capSize -= 1;
    ctx.font = archivo(capSize);
  }
  try {
    ctx.letterSpacing = `${Math.round(capSize * 0.14)}px`;
  } catch {
    /* ignore */
  }
  ctx.fillStyle = '#f5f2ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(capText, W / 2, capTop + capH / 2 + 1);
  ctx.restore();

  // The starburst goes on last among the stickers, bottom right, its whole
  // badge held `inset` away from the right edge and the caption bar.
  if (state.stickers.burst) {
    const r = W * 0.058;
    drawBurst(ctx, W - inset - r, capTop - inset - r, r);
  }

  if (state.grain) {
    if (!grainTile) grainTile = makeGrainTile();
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// Render the cover at a named export size onto a fresh canvas.
export function renderToCanvas(state, images, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas.getContext('2d'), size.w, size.h, state, images, {});
  return canvas;
}

export function exportCoverPNG(state, images, sizeKey) {
  return renderToCanvas(state, images, sizeKey).toDataURL('image/png');
}
