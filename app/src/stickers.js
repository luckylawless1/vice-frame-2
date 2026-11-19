// Original stickers for VICE FRAME 2, drawn with canvas paths at render
// time: a palm tree silhouette, a starburst with NEW! on it, a retro striped
// sun, and the five-point wanted star. Nothing here is a picture of anything
// from a game; every shape is drawn from scratch below.

// A single five-point star centred on (cx, cy) with outer radius r.
export function starPath(ctx, cx, cy, r, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = rot + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// The wanted-stars row: five gold stars in a line, centred on cx, with the
// row's top edge at topY. Returns the row's height so callers can stack
// other elements under it. Callers place topY below the masthead title with
// a clear gap; the stars never move up into the title.
export function drawWantedStars(ctx, cx, topY, r) {
  const gap = r * 2.45;
  const startX = cx - gap * 2;
  for (let i = 0; i < 5; i++) {
    const x = startX + i * gap;
    const y = topY + r;
    starPath(ctx, x, y, r);
    ctx.save();
    ctx.fillStyle = '#ffc93c';
    ctx.strokeStyle = '#191008';
    ctx.lineWidth = r * 0.14;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = r * 0.3;
    ctx.shadowOffsetY = r * 0.1;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();
  }
  return r * 2;
}

// A palm tree silhouette whose trunk base sits at (x, y) and whose crown
// reaches about `height` above it. The trunk is one slim curve; the fronds
// are long thin arcs that rise out of the crown and droop well below it at
// their tips, the way a real palm's leaves hang.
export function drawPalm(ctx, x, y, height) {
  const s = height;
  ctx.save();
  ctx.strokeStyle = '#0d0d16';
  ctx.fillStyle = '#0d0d16';
  ctx.lineCap = 'round';
  // Trunk: a gentle curve leaning right.
  ctx.lineWidth = s * 0.042;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.04, y - s * 0.55, x + s * 0.16, y - s * 0.94);
  ctx.stroke();
  const topX = x + s * 0.16;
  const topY = y - s * 0.94;
  // Fronds: each is [controlX, controlY, endX, endY] relative to the crown.
  // Controls sit up and out; tips land far out and below the crown.
  ctx.lineWidth = s * 0.026;
  const fronds = [
    [-0.55, -0.34, -1.02, 0.16],
    [-0.38, -0.44, -0.78, 0.02],
    [-0.14, -0.5, -0.4, -0.12],
    [0.12, -0.52, 0.3, -0.18],
    [0.38, -0.46, 0.72, -0.02],
    [0.55, -0.32, 0.98, 0.18],
    [0.02, -0.56, 0.06, -0.3],
  ];
  for (const [cx, cy, ex, ey] of fronds) {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + cx * s, topY + cy * s, topX + ex * s, topY + ey * s);
    ctx.stroke();
  }
  // Coconuts.
  for (const [dx, dy] of [[-0.025, 0.028], [0.06, 0.04]]) {
    ctx.beginPath();
    ctx.arc(topX + dx * s, topY + dy * s, s * 0.034, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// A starburst badge with NEW! across it, centred on (cx, cy) with radius r.
// The caller guarantees the whole badge sits at least 24 px inside the
// canvas: cx - r and cy - r are the inset, and the badge is never clipped.
export function drawBurst(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.18);
  const points = 16;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.8;
    const a = (i * Math.PI) / points;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#ff2e88');
  g.addColorStop(1, '#e01f26');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = r * 0.07;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = r * 0.22;
  ctx.shadowOffsetY = r * 0.08;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(r * 0.52)}px "Archivo Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEW!', 0, r * 0.03);
  ctx.restore();
}

// A retro sun: a circle of horizontal slices, warm at the top and pink at
// the bottom, the gaps between slices widening towards the base.
export function drawRetroSun(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#ffd319');
  g.addColorStop(0.55, '#ff7b39');
  g.addColorStop(1, '#ff2975');
  ctx.fillStyle = g;
  const bands = 9;
  const bandH = (r * 2) / bands;
  for (let k = 0; k < bands; k++) {
    const y0 = cy - r + k * bandH;
    const shrink = k < 3 ? 0.06 : 0.06 + (k - 2) * 0.13;
    ctx.fillRect(cx - r, y0, r * 2, bandH * (1 - shrink));
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(20, 8, 16, 0.35)';
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.stroke();
  ctx.restore();
}
