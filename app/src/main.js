// VICE FRAME 2 editor: state, controls, canvas interaction and the staged
// screenshot scenes. Everything runs locally; photos are read as files or
// object URLs and never sent anywhere.

import { LAYOUTS, SIZES, panelRects } from './layouts.js';
import { renderCover, exportCoverPNG, clampPan, photoTransform } from './cover.js';

const SAMPLES = [
  { id: 'neon-boulevard', src: 'samples/neon-boulevard.jpg', name: 'Neon Boulevard' },
  { id: 'woman-pink-car', src: 'samples/woman-pink-car.jpg', name: 'Pink Car' },
  { id: 'boulevard', src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { id: 'duo-rooftop', src: 'samples/duo-rooftop.jpg', name: 'Rooftop Duo' },
  { id: 'man-boardwalk', src: 'samples/man-boardwalk.jpg', name: 'Boardwalk' },
  { id: 'pier', src: 'samples/pier.jpg', name: 'Pier' },
  { id: 'yacht-sunset', src: 'samples/yacht-sunset.jpg', name: 'Yacht Sunset' },
];

const images = new Map();
let uploadCount = 0;

function panel(photo, grade) {
  return { photo, grade, panX: 0, panY: 0, zoom: 1 };
}

const state = {
  title: 'VICE CITY HEAT',
  tagline: 'TWO CREWS. ONE CITY.',
  caption: 'EVERY SUNSET HAS A PRICE',
  layout: 'panel-grid',
  size: 'landscape',
  panels: [
    panel('neon-boulevard', 'neon-night'),
    panel('boulevard', 'vice-sunset'),
    panel('duo-rooftop', 'clean'),
    panel('pier', 'vice-sunset'),
  ],
  stickers: { stars: true, burst: true, sun: true, palm: true },
  grain: true,
  selected: 0,
};

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadFonts() {
  const anton = new FontFace('Anton', 'url(fonts/Anton-Regular.ttf)');
  const archivo = new FontFace('Archivo Black', 'url(fonts/ArchivoBlack-Regular.ttf)');
  document.fonts.add(anton);
  document.fonts.add(archivo);
  await Promise.all([anton.load(), archivo.load()]);
}

// ---------------------------------------------------------------- editor

let drawQueued = false;
function scheduleDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    draw();
  });
}

function editorSize() {
  const s = SIZES[state.size];
  const w = Math.min(s.w, 1152);
  return { w, h: Math.round((w * s.h) / s.w) };
}

function draw() {
  const { w, h } = editorSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx, w, h, state, images, { selected: state.selected });
  markThumbs();
  syncPanelControls();
}

function canvasPos(event) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - r.left) / r.width) * canvas.width,
    y: ((event.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(x, y) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const slots = LAYOUTS[state.layout].slots;
  for (let i = 0; i < slots; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function markThumbs() {
  const current = state.panels[state.selected]?.photo;
  document.querySelectorAll('#thumbs .thumb').forEach((el) => {
    el.classList.toggle('in-use', el.dataset.photo === current);
  });
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  if (!p) return;
  const grade = document.getElementById('in-grade');
  const zoom = document.getElementById('in-zoom');
  if (grade && grade.value !== p.grade) grade.value = p.grade;
  if (zoom && document.activeElement !== zoom) zoom.value = Math.round(p.zoom * 100);
}

function addThumb(key, src, name) {
  const wrap = document.getElementById('thumbs');
  const img = document.createElement('img');
  img.className = 'thumb';
  img.src = src;
  img.alt = name;
  img.title = name;
  img.dataset.photo = key;
  img.addEventListener('click', () => {
    state.panels[state.selected].photo = key;
    scheduleDraw();
  });
  wrap.appendChild(img);
}

function addPhotoFiles(files, assignFirst) {
  let first = true;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const key = `upload-${++uploadCount}`;
    const url = URL.createObjectURL(file);
    loadImage(url).then((img) => {
      images.set(key, img);
      addThumb(key, url, file.name);
      if (assignFirst && first) {
        state.panels[state.selected].photo = key;
      }
      first = false;
      scheduleDraw();
    });
  }
}

function buildUI() {
  for (const s of SAMPLES) addThumb(s.id, s.src, s.name);

  const bindRow = (rowId, attr, apply) => {
    const row = document.getElementById(rowId);
    row.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset[attr] === apply.current());
      btn.addEventListener('click', () => {
        apply.set(btn.dataset[attr]);
        row.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
        scheduleDraw();
      });
    });
  };
  bindRow('layout-row', 'layout', {
    current: () => state.layout,
    set: (v) => {
      state.layout = v;
      if (state.selected >= LAYOUTS[v].slots) state.selected = 0;
    },
  });
  bindRow('size-row', 'size', {
    current: () => state.size,
    set: (v) => {
      state.size = v;
    },
  });

  const bindText = (id, get, set) => {
    const el = document.getElementById(id);
    el.value = get();
    el.addEventListener('input', () => {
      set(el.value);
      scheduleDraw();
    });
  };
  bindText('in-title', () => state.title, (v) => (state.title = v));
  bindText('in-tagline', () => state.tagline, (v) => (state.tagline = v));
  bindText('in-caption', () => state.caption, (v) => (state.caption = v));

  document.getElementById('in-upload').addEventListener('change', (e) => {
    addPhotoFiles([...e.target.files], true);
    e.target.value = '';
  });

  document.getElementById('in-grade').addEventListener('change', (e) => {
    state.panels[state.selected].grade = e.target.value;
    scheduleDraw();
  });
  document.getElementById('btn-grade-all').addEventListener('click', () => {
    const grade = document.getElementById('in-grade').value;
    for (const p of state.panels) p.grade = grade;
    scheduleDraw();
  });
  document.getElementById('in-zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    scheduleDraw();
  });

  const bindCheck = (id, get, set) => {
    const el = document.getElementById(id);
    el.checked = get();
    el.addEventListener('change', () => {
      set(el.checked);
      scheduleDraw();
    });
  };
  bindCheck('ck-stars', () => state.stickers.stars, (v) => (state.stickers.stars = v));
  bindCheck('ck-burst', () => state.stickers.burst, (v) => (state.stickers.burst = v));
  bindCheck('ck-sun', () => state.stickers.sun, (v) => (state.stickers.sun = v));
  bindCheck('ck-palm', () => state.stickers.palm, (v) => (state.stickers.palm = v));
  bindCheck('ck-grain', () => state.grain, (v) => (state.grain = v));

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.export;
      const a = document.createElement('a');
      a.href = exportCoverPNG(state, images, key);
      a.download = `vice-frame-2-${key}.png`;
      a.click();
    });
  });

  // Pointer work on the cover: click selects a panel, drag pans its photo,
  // the wheel zooms the panel under the pointer.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const pos = canvasPos(e);
    const hit = hitPanel(pos.x, pos.y);
    if (hit >= 0) {
      state.selected = hit;
      drag = { panel: hit, lastX: pos.x, lastY: pos.y };
      canvas.setPointerCapture(e.pointerId);
      scheduleDraw();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pos = canvasPos(e);
    const dx = pos.x - drag.lastX;
    const dy = pos.y - drag.lastY;
    drag.lastX = pos.x;
    drag.lastY = pos.y;
    const p = state.panels[drag.panel];
    const img = images.get(p.photo);
    if (!img) return;
    const rect = panelRects(state.layout, canvas.width, canvas.height)[drag.panel];
    const t = photoTransform(p, rect, img);
    const rangeX = Math.max(0, t.w - rect.w);
    const rangeY = Math.max(0, t.h - rect.h);
    if (rangeX > 0) p.panX += (dx * 2) / rangeX;
    if (rangeY > 0) p.panY += (dy * 2) / rangeY;
    clampPan(p);
    scheduleDraw();
  });
  const endDrag = () => {
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const pos = canvasPos(e);
      const hit = hitPanel(pos.x, pos.y);
      const idx = hit >= 0 ? hit : state.selected;
      state.selected = idx;
      const p = state.panels[idx];
      p.zoom *= e.deltaY < 0 ? 1.07 : 0.935;
      clampPan(p);
      scheduleDraw();
    },
    { passive: false },
  );

  const wrap = document.getElementById('stage-wrap');
  wrap.addEventListener('dragover', (e) => e.preventDefault());
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    addPhotoFiles([...e.dataTransfer.files], true);
  });

  // Arrow keys nudge the selected panel's photo for fine framing; Shift
  // makes the steps bigger. Ignored while typing in a control.
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const step = e.shiftKey ? 0.12 : 0.03;
    const p = state.panels[state.selected];
    if (!p) return;
    if (e.key === 'ArrowLeft') p.panX -= step;
    else if (e.key === 'ArrowRight') p.panX += step;
    else if (e.key === 'ArrowUp') p.panY -= step;
    else if (e.key === 'ArrowDown') p.panY += step;
    else return;
    e.preventDefault();
    clampPan(p);
    scheduleDraw();
  });
}

// ---------------------------------------------------------------- staging

function stageScene(shot) {
  document.body.classList.add('stage');
  if (shot === 'portrait') {
    state.layout = 'cover-star';
    state.size = 'portrait';
    state.panels[0] = panel('woman-pink-car', 'vice-sunset');
    state.panels[1] = panel('man-boardwalk', 'clean');
    state.panels[2] = panel('yacht-sunset', 'vice-sunset');
  } else if (shot === 'square') {
    state.layout = 'collage-four';
    state.size = 'square';
    state.panels[0] = panel('woman-pink-car', 'clean');
    state.panels[1] = panel('boulevard', 'vice-sunset');
    state.panels[2] = panel('duo-rooftop', 'neon-night');
    state.panels[3] = panel('pier', 'clean');
  } else {
    // 'cover': the default preset, landscape.
    state.size = 'landscape';
  }
  const s = SIZES[state.size];
  canvas.width = s.w;
  canvas.height = s.h;
  renderCover(ctx, s.w, s.h, state, images, {});
}

async function init() {
  await loadFonts();
  await Promise.all(
    SAMPLES.map(async (s) => {
      images.set(s.id, await loadImage(s.src));
    }),
  );
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === 'cover' || shot === 'portrait' || shot === 'square') {
    stageScene(shot);
  } else {
    buildUI();
    draw();
  }
  window.__SHOT_READY = true;
}

window.__exportCover = (sizeKey) => exportCoverPNG(state, images, sizeKey);

init().catch((err) => {
  console.error(err);
});
