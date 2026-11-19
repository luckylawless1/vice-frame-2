// Colour grades for VICE FRAME 2. Each grade takes a source photo already
// fitted into a panel rectangle (drawn by cover.js through photoTransform)
// and re-renders it with a look:
//
//   clean       the photo as it is
//   vice-sunset warm sunset wash: sepia, extra saturation, orange-to-pink veil
//   neon-night  cool night look: heavy saturation, contrast, teal-to-violet veil
//   ink-poster  hand-drawn print feel: posterized ink colours, darkened edges
//               from a small Sobel pass, and halftone dots in the shadows
//
// drawGraded(ctx, img, t, grade) draws img at the transform t = {x, y, w, h}
// (the destination rectangle of the fitted photo, which may extend past the
// panel; the caller clips to the panel first).

export const GRADES = {
  clean: { label: 'Clean' },
  'vice-sunset': { label: 'Vice Sunset' },
  'neon-night': { label: 'Neon Night' },
  'ink-poster': { label: 'Ink Poster' },
};

const scratchPool = new Map();
function scratchCanvas(name, w, h) {
  let c = scratchPool.get(name);
  if (!c) {
    c = document.createElement('canvas');
    scratchPool.set(name, c);
  }
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function veil(ctx, x, y, w, h, stops, mode) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function posterize(data, levels) {
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      // A gentle S-curve first, so midtones separate like ink washes.
      const curved = v + Math.sin((v / 255 - 0.5) * Math.PI) * 18;
      data[i + c] = Math.round(curved / step) * step;
    }
  }
}

function edgeCanvas(img, t) {
  // A small grayscale "ink lines" image: white paper, dark where the photo
  // has a strong luminance step. Drawn back upscaled with multiply, it lays
  // soft dark edges over the posterized colours.
  const sw = 240;
  const sh = Math.max(2, Math.round((sw * t.h) / t.w));
  const small = scratchCanvas('edges', sw, sh);
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, sw, sh);
  const src = sctx.getImageData(0, 0, sw, sh);
  const out = sctx.createImageData(sw, sh);
  const lum = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    lum[i] = 0.2126 * src.data[i * 4] + 0.7152 * src.data[i * 4 + 1] + 0.0722 * src.data[i * 4 + 2];
  }
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = y * sw + x;
      const dx = Math.abs(lum[y * sw + Math.min(sw - 1, x + 1)] - lum[y * sw + Math.max(0, x - 1)]);
      const dy = Math.abs(lum[Math.min(sh - 1, y + 1) * sw + x] - lum[Math.max(0, y - 1) * sw + x]);
      const edge = Math.min(255, (dx + dy) * 1.6);
      const v = 255 - edge;
      out.data[i * 4] = v;
      out.data[i * 4 + 1] = v;
      out.data[i * 4 + 2] = v;
      out.data[i * 4 + 3] = 255;
    }
  }
  sctx.putImageData(out, 0, 0);
  return small;
}

function halftone(ctx, imgData, x, y, w, h) {
  // Dots whose radius grows as the posterized colour darkens, on a coarse
  // grid: the classic newsprint screen.
  const step = Math.max(5, Math.round(w / 190));
  const data = imgData.data;
  const iw = imgData.width;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 8, 14, 0.55)';
  ctx.beginPath();
  for (let gy = step / 2; gy < h; gy += step) {
    for (let gx = step / 2; gx < w; gx += step) {
      const px = Math.min(iw - 1, Math.round(gx));
      const py = Math.min(imgData.height - 1, Math.round(gy));
      const i = (py * iw + px) * 4;
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      if (lum > 0.82) continue;
      const r = (1 - lum) * step * 0.58;
      if (r < 0.4) continue;
      ctx.moveTo(x + gx + r, y + gy);
      ctx.arc(x + gx, y + gy, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

function drawInkPoster(ctx, img, t) {
  const w = Math.max(2, Math.round(t.w));
  const h = Math.max(2, Math.round(t.h));
  const layer = scratchCanvas('ink', w, h);
  const lctx = layer.getContext('2d', { willReadFrequently: true });
  lctx.filter = 'saturate(1.25) contrast(1.08)';
  lctx.drawImage(img, 0, 0, w, h);
  lctx.filter = 'none';
  const imgData = lctx.getImageData(0, 0, w, h);
  posterize(imgData.data, 5);
  lctx.putImageData(imgData, 0, 0);
  // Ink edges, multiplied over the flat colour.
  const edges = edgeCanvas(img, t);
  lctx.save();
  lctx.globalCompositeOperation = 'multiply';
  lctx.globalAlpha = 0.5;
  lctx.imageSmoothingEnabled = true;
  lctx.drawImage(edges, 0, 0, w, h);
  lctx.restore();
  halftone(lctx, lctx.getImageData(0, 0, w, h), 0, 0, w, h);
  ctx.drawImage(layer, t.x, t.y);
}

export function drawGraded(ctx, img, t, grade) {
  if (grade === 'ink-poster') {
    drawInkPoster(ctx, img, t);
    return;
  }
  ctx.save();
  if (grade === 'vice-sunset') {
    ctx.filter = 'saturate(1.35) contrast(1.06) sepia(0.32) hue-rotate(-8deg) brightness(1.04)';
  } else if (grade === 'neon-night') {
    ctx.filter = 'saturate(1.65) contrast(1.18) brightness(0.95) hue-rotate(12deg)';
  }
  ctx.drawImage(img, t.x, t.y, t.w, t.h);
  ctx.restore();
  if (grade === 'vice-sunset') {
    veil(ctx, t.x, t.y, t.w, t.h, [[0, 'rgba(255, 140, 40, 0.20)'], [1, 'rgba(255, 45, 130, 0.20)']], 'soft-light');
  } else if (grade === 'neon-night') {
    veil(ctx, t.x, t.y, t.w, t.h, [[0, 'rgba(20, 220, 200, 0.16)'], [1, 'rgba(120, 40, 220, 0.22)']], 'soft-light');
  }
}
