// Neon Coast's cover engine: draws a multi-panel GTA-style poster cover onto any
// 2D canvas, from the app's state. No libraries, no network, no fonts to load:
// lettering uses condensed system sans for the title and an italic serif for the
// subtitle. Everything it draws is original art made in code.

/** The export sizes the app offers, in pixels. */
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** How many photo panels each layout holds. */
export const PANEL_COUNTS = { full: 1, grid: 4, hero: 4, tilt: 3 };

/** A fresh cover state: one photo per panel, Sunset grade, white frame. */
export function createState() {
  return {
    size: '1080x1080',
    layout: 'full',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'midnight run',
    badge: 'EST. 2026',
    frame: 'white',
    grain: true,
    vignette: true,
    photos: [],
    panels: [
      { photo: 0, zoom: 1, dx: 0, dy: 0 },
      { photo: 1, zoom: 1, dx: 0, dy: 0 },
      { photo: 0, zoom: 1, dx: 0, dy: 0 },
      { photo: 1, zoom: 1, dx: 0, dy: 0 },
    ],
  };
}

/** A tiny deterministic PRNG, so the film grain looks the same on every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainPattern = null;
/** A reusable 160x160 noise tile, built once from the seeded PRNG. */
function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const rand = mulberry32(20261119);
  for (let i = 0; i < 5200; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    tctx.fillStyle = `rgba(${v},${v},${v},${0.05 + rand() * 0.09})`;
    tctx.fillRect(Math.floor(rand() * 160), Math.floor(rand() * 160), 1, 1);
  }
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

/**
 * The panel rectangles for a layout, in fractions of the canvas (x, y, w, h,
 * and a rotation in degrees around the panel's centre).
 */
export function panelRects(layout, w, h) {
  const m = 0.02; // outer margin
  const g = 0.015; // gap between panels
  const isWide = w > h;
  if (layout === 'full') return [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }];
  if (layout === 'grid') {
    const pw = (1 - 2 * m - g) / 2;
    const ph = (1 - 2 * m - g) / 2;
    return [
      { x: m, y: m, w: pw, h: ph, rot: 0 },
      { x: m + pw + g, y: m, w: pw, h: ph, rot: 0 },
      { x: m, y: m + ph + g, w: pw, h: ph, rot: 0 },
      { x: m + pw + g, y: m + ph + g, w: pw, h: ph, rot: 0 },
    ];
  }
  if (layout === 'hero') {
    if (isWide) {
      const heroW = 0.58;
      const colX = m + heroW + g;
      const colW = 1 - m - colX;
      const ph = (1 - 2 * m - 2 * g) / 3;
      return [
        { x: m, y: m, w: heroW, h: 1 - 2 * m, rot: 0 },
        { x: colX, y: m, w: colW, h: ph, rot: 0 },
        { x: colX, y: m + ph + g, w: colW, h: ph, rot: 0 },
        { x: colX, y: m + 2 * (ph + g), w: colW, h: ph, rot: 0 },
      ];
    }
    const heroH = 0.58;
    const rowY = m + heroH + g;
    const rowH = 1 - m - rowY;
    const pw = (1 - 2 * m - 2 * g) / 3;
    return [
      { x: m, y: m, w: 1 - 2 * m, h: heroH, rot: 0 },
      { x: m, y: rowY, w: pw, h: rowH, rot: 0 },
      { x: m + pw + g, y: rowY, w: pw, h: rowH, rot: 0 },
      { x: m + 2 * (pw + g), y: rowY, w: pw, h: rowH, rot: 0 },
    ];
  }
  // tilt: three overlapping snapshots, scattered like prints on a table.
  return [
    { x: 0.05, y: 0.045, w: 0.56, h: 0.52, rot: -5 },
    { x: 0.42, y: 0.15, w: 0.53, h: 0.5, rot: 4 },
    { x: 0.12, y: 0.52, w: 0.58, h: 0.42, rot: -3 },
  ];
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
function drawPanelPhoto(ctx, photo, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3b1d52');
    g.addColorStop(1, '#141024');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    const iw = photo.naturalWidth || photo.width;
    const ih = photo.naturalHeight || photo.height;
    const scale = Math.max(w / iw, h / ih) * panel.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const slackX = Math.max(0, (dw - w) / 2);
    const slackY = Math.max(0, (dh - h) / 2);
    if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.05)';
    ctx.drawImage(photo, x + (w - dw) / 2 + panel.dx * slackX, y + (h - dh) / 2 + panel.dy * slackY, dw, dh);
    ctx.filter = 'none';
  }
  applyGrade(ctx, rect, grade);
  ctx.restore();
}

/** The colour grade: tinted gradients over the photo, one look per grade. */
function applyGrade(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const wash = (stops, mode, alpha) => {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };
  if (grade === 'sunset') {
    wash([[0, '#ff783c'], [1, '#c41e6e']], 'overlay', 0.55);
    wash([[0, '#ff9a5c'], [1, '#ff2e88']], 'soft-light', 0.5);
  } else if (grade === 'neon') {
    wash([[0, '#ff008c'], [0.5, '#7b2bff'], [1, '#00d8ff']], 'overlay', 0.6);
    wash([[0, '#2b0a4d'], [1, '#001233']], 'multiply', 0.35);
  } else if (grade === 'teal') {
    wash([[0, '#00c2ad'], [1, '#0057a8']], 'overlay', 0.5);
    wash([[0, '#00283d'], [1, '#003d33']], 'multiply', 0.3);
  } else if (grade === 'gold') {
    wash([[0, '#ffb020'], [1, '#ff7a1a']], 'soft-light', 0.65);
    wash([[0, '#3d1c00'], [1, '#4d2200']], 'multiply', 0.22);
  } else if (grade === 'noir') {
    wash([[0, '#fff2dc'], [1, '#c8d4ff']], 'soft-light', 0.35);
  }
}

/** Halftone dots across the tilt layout's backdrop, denser toward the bottom. */
function drawHalftone(ctx, w, h) {
  const step = Math.max(14, w * 0.016);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  for (let row = 0, yy = step / 2; yy < h; row++, yy += step) {
    for (let xx = step / 2 + (row % 2 ? step / 2 : 0); xx < w; xx += step) {
      const r = step * 0.12 + (yy / h) * step * 0.16;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The title block: scrim, subtitle, big condensed title, and the badge pill. */
function drawLettering(ctx, w, h, state) {
  const pad = w * 0.045;
  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.6, 0, h);
  scrim.addColorStop(0, 'rgba(8, 2, 16, 0)');
  scrim.addColorStop(0.55, 'rgba(8, 2, 16, 0.55)');
  scrim.addColorStop(1, 'rgba(8, 2, 16, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);

  const title = state.title.trim().toUpperCase();
  const sub = state.subtitle.trim();
  const base = Math.min(w, h);
  let size = base * 0.115;
  const titleFont = (s) => `900 ${s}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  if (title) {
    ctx.font = titleFont(size);
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas: no letter-spacing */ }
    while (size > 14 && ctx.measureText(title).width > w - pad * 2) {
      size -= 2;
      ctx.font = titleFont(size);
    }
    const ty = h - pad * 0.9;
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 2, 18, 0.9)';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeText(title, pad, ty);
    const grad = ctx.createLinearGradient(pad, ty - size, pad, ty);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, '#ffe9c9');
    grad.addColorStop(1, '#ffb347');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255, 60, 120, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.fillText(title, pad, ty);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    if (sub) {
      ctx.font = `italic 700 ${Math.round(size * 0.34)}px Georgia, "Times New Roman", serif`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(sub, pad + 2, ty - size * 1.12);
    }
  }
  const badge = state.badge.trim();
  if (badge) {
    const bs = Math.round(base * 0.028);
    ctx.font = `800 ${bs}px "Arial Narrow", Arial, sans-serif`;
    const bw = ctx.measureText(badge).width + bs * 1.6;
    const bh = bs * 2.1;
    ctx.save();
    ctx.translate(w - pad - bw / 2, pad + bh / 2);
    ctx.rotate(0.1);
    ctx.fillStyle = '#ff5e8a';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = bh * 0.3;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 0, 1);
    ctx.restore();
  }
}

/** A rounded rectangle path (no Path2D, so it runs everywhere). */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Draws the whole cover onto `canvas` from `state`. The canvas keeps its own
 * pixel size; the drawing scales to it.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const count = PANEL_COUNTS[state.layout] ?? 1;
  const rects = panelRects(state.layout, w, h);

  // Backdrop: deep dusk, with halftone dots for the scattered-snapshots layout.
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#241232');
  bg.addColorStop(0.55, '#1a0f28');
  bg.addColorStop(1, '#0d1526');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (state.layout === 'tilt') drawHalftone(ctx, w, h);

  for (let i = 0; i < count; i++) {
    const r = rects[i];
    const rect = { x: r.x * w, y: r.y * h, w: r.w * w, h: r.h * h };
    const panel = state.panels[i];
    const photo = panel && panel.photo != null ? state.photos[panel.photo] ?? null : null;
    ctx.save();
    if (r.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((r.rot * Math.PI) / 180);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    if (state.layout === 'tilt') {
      // A white snapshot border with a soft drop shadow.
      const border = Math.max(6, Math.min(w, h) * 0.012);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = border * 1.6;
      ctx.shadowOffsetY = border * 0.6;
      ctx.fillStyle = '#f8f4ee';
      ctx.fillRect(rect.x - border, rect.y - border, rect.w + border * 2, rect.h + border * 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    drawPanelPhoto(ctx, photo, rect, panel, state.grade);
    if (state.layout !== 'tilt') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.0025);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  }

  drawLettering(ctx, w, h, state);

  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(8, 0, 16, 0)');
    vg.addColorStop(1, 'rgba(8, 0, 16, 0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = getGrainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.frame !== 'none') {
    const bw = Math.max(4, Math.min(w, h) * 0.018);
    ctx.strokeStyle = state.frame === 'white' ? '#f8f4ee' : '#0d0a12';
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
  }
}

/** Renders the cover at an exact pixel size on a fresh canvas and returns it. */
export function renderCover(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
