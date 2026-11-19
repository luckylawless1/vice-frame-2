// Layout definitions for VICE FRAME 2.
// Panel rectangles are fractions of the cover's width and height, so the same
// layout works at every export size. `slots` is how many photo panels the
// layout shows; the editor keeps a pool of four panel setups and each layout
// uses the first `slots` of them.

export const SIZES = {
  square: { label: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  landscape: { label: 'Landscape · 1920 x 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  'cover-star': {
    label: 'Cover Star',
    slots: 3,
    panels: [
      { x: 0, y: 0, w: 0.655, h: 1 },
      { x: 0.655, y: 0, w: 0.345, h: 0.5 },
      { x: 0.655, y: 0.5, w: 0.345, h: 0.5 },
    ],
  },
  'collage-four': {
    label: 'Collage Four',
    slots: 4,
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  'panel-grid': {
    label: 'Panel Grid',
    slots: 4,
    panels: [
      { x: 0, y: 0, w: 1, h: 0.56 },
      { x: 0, y: 0.56, w: 1 / 3, h: 0.44 },
      { x: 1 / 3, y: 0.56, w: 1 / 3, h: 0.44 },
      { x: 2 / 3, y: 0.56, w: 1 / 3, h: 0.44 },
    ],
  },
  'crew-wide': {
    label: 'Crew Wide',
    slots: 3,
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
};

// Pixel rectangles for a layout on a W x H canvas. Every panel is inset by
// half a gutter on each side, which leaves a full gutter between neighbours
// and a half gutter at the canvas edge.
export function panelRects(layoutKey, W, H) {
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS['panel-grid'];
  const gap = Math.max(3, Math.round(W * 0.004));
  return layout.panels.map((p) => ({
    x: p.x * W + gap / 2,
    y: p.y * H + gap / 2,
    w: p.w * W - gap,
    h: p.h * H - gap,
  }));
}
