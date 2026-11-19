// Wires Neon Coast's editor: photos in, panels to drag and crop, lettering,
// grades and layouts, and PNG exports in the three post sizes. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).
import { SIZES, PANEL_COUNTS, createState, drawCover, panelRects, renderCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const panelPhoto = document.getElementById('panel-photo');
const zoomInput = document.getElementById('zoom');
const zoomValue = document.getElementById('zoom-value');

const state = createState();
let selectedPanel = 0;
let redrawQueued = false;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    drawCover(canvas, state);
  });
}

function setStatus(text) {
  status.textContent = text;
}

/** Rebuilds the per-panel photo picker from the photos loaded so far. */
function refreshPanelPicker() {
  const keep = panelPhoto.value;
  panelPhoto.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '(empty panel)';
  panelPhoto.appendChild(none);
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = photo.dataset?.label ?? `Photo ${i + 1}`;
    panelPhoto.appendChild(opt);
  });
  const panel = state.panels[selectedPanel];
  panelPhoto.value = panel.photo == null ? '' : String(panel.photo);
  if (keep !== '' && panelPhoto.value === '' && panel.photo != null) panelPhoto.value = keep;
  zoomInput.value = String(Math.round(panel.zoom * 100));
  zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
}

/** Adds a loaded photo to the tray and fills the first empty panel with it. */
function addPhoto(img, label) {
  img.dataset.label = label;
  state.photos.push(img);
  const idx = state.photos.length - 1;
  const empty = state.panels.findIndex((p) => p.photo == null);
  if (empty !== -1) state.panels[empty].photo = idx;
  else if (state.photos.length === 1) state.panels.forEach((p) => { p.photo = 0; });
  refreshPanelPicker();
  redraw();
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    try {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  e.target.value = '';
});

async function loadSample(name, label) {
  try {
    addPhoto(await loadImage(`samples/${name}.jpg`), label);
    setStatus(`Loaded the ${label} sample photo.`);
  } catch {
    setStatus(`Could not load the ${label} sample.`);
  }
}
document.getElementById('sample-boulevard').addEventListener('click', () => loadSample('boulevard', 'Boulevard'));
document.getElementById('sample-pier').addEventListener('click', () => loadSample('pier', 'Pier'));

panelPhoto.addEventListener('change', () => {
  const panel = state.panels[selectedPanel];
  panel.photo = panelPhoto.value === '' ? null : Number(panelPhoto.value);
  redraw();
});

zoomInput.addEventListener('input', () => {
  const panel = state.panels[selectedPanel];
  panel.zoom = Number(zoomInput.value) / 100;
  zoomValue.textContent = `${zoomInput.value}%`;
  redraw();
});

/** One row of exclusive choice buttons (layout, grade, size). */
function wireChoiceRow(id, apply) {
  const row = document.getElementById(id);
  row.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    row.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    apply(btn.dataset);
    redraw();
  });
}

wireChoiceRow('layout-row', (d) => {
  state.layout = d.layout;
  const count = PANEL_COUNTS[state.layout];
  if (selectedPanel >= count) selectedPanel = 0;
  refreshPanelPicker();
});
wireChoiceRow('grade-row', (d) => { state.grade = d.grade; });
wireChoiceRow('size-row', (d) => {
  state.size = d.size;
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
});

for (const [id, key] of [['title', 'title'], ['subtitle', 'subtitle'], ['badge', 'badge']]) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    redraw();
  });
}
document.getElementById('frame').addEventListener('change', (e) => {
  state.frame = e.target.value;
  redraw();
});
document.getElementById('grain').addEventListener('change', (e) => {
  state.grain = e.target.checked;
  redraw();
});
document.getElementById('vignette').addEventListener('change', (e) => {
  state.vignette = e.target.checked;
  redraw();
});

// Panel editing on the preview: click to select a panel, drag to pan its photo.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}
function panelAt(point) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const count = PANEL_COUNTS[state.layout];
  for (let i = count - 1; i >= 0; i--) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const at = panelAt(canvasPoint(e));
  if (at === -1) return;
  selectedPanel = at;
  refreshPanelPicker();
  dragging = { start: canvasPoint(e), dx: state.panels[at].dx, dy: state.panels[at].dy };
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const now = canvasPoint(e);
  const panel = state.panels[selectedPanel];
  panel.dx = clamp(dragging.dx + (now.x - dragging.start.x) * 2, -1, 1);
  panel.dy = clamp(dragging.dy + (now.y - dragging.start.y) * 2, -1, 1);
  redraw();
});
const endDrag = () => { dragging = null; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** Saves a canvas as a PNG file download. */
function downloadCanvas(art, name) {
  return new Promise((resolve) => {
    art.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', async () => {
  const [w, h] = SIZES[state.size];
  await downloadCanvas(renderCover(state, w, h), `neon-coast-${state.size}.png`);
  setStatus(`Saved neon-coast-${state.size}.png`);
});

document.getElementById('export-all').addEventListener('click', async () => {
  for (const size of Object.keys(SIZES)) {
    const [w, h] = SIZES[size];
    await downloadCanvas(renderCover(state, w, h), `neon-coast-${size}.png`);
  }
  setStatus('Saved all three sizes.');
});

// Screenshot scenes, or the plain editor with the Boulevard sample loaded.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, state, {
    loadImage,
    addPhoto,
    redraw,
    refreshPanelPicker,
    setSize: (size) => {
      state.size = size;
      const [w, h] = SIZES[size];
      canvas.width = w;
      canvas.height = h;
    },
  });
} else {
  loadSample('boulevard', 'Boulevard');
  redraw();
}
