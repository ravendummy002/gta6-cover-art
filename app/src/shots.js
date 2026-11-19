// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo
// loaded; ?shot=cover shows the cover alone, edge to edge. Query parameters:
//   photo    boulevard | pier | both (default boulevard)
//   layout   full | grid | hero | tilt (default full)
//   grade    sunset | neon | teal | noir | gold (default sunset)
//   size     1080x1080 | 1080x1350 | 1920x1080 (default 1080x1080)
//   title, subtitle, badge   the lettering (defaults: NEON COAST / midnight run / EST. 2026)
// window.__shotReady is set once the cover has been painted.
export async function runShot(shot, query, state, app) {
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const size = query.get('size') ?? '1080x1080';
  app.setSize(size);
  state.layout = query.get('layout') ?? 'full';
  state.grade = query.get('grade') ?? 'sunset';
  state.title = query.get('title') ?? 'NEON COAST';
  state.subtitle = query.get('subtitle') ?? 'midnight run';
  state.badge = query.get('badge') ?? 'EST. 2026';

  const which = query.get('photo') ?? 'boulevard';
  const names = which === 'both' ? ['boulevard', 'pier'] : [which];
  for (const name of names) {
    const img = await app.loadImage(`samples/${name}.jpg`);
    img.dataset.label = name === 'boulevard' ? 'Boulevard' : 'Pier';
    state.photos.push(img);
  }
  // Spread the loaded photos across the panels, alternating when there are two.
  state.panels.forEach((panel, i) => {
    panel.photo = state.photos.length === 0 ? null : i % state.photos.length;
    panel.zoom = 1;
    panel.dx = 0;
    panel.dy = 0;
  });

  // Mirror the scene into the visible controls, so the editor shot shows them set.
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  for (const [rowId, key, value] of [
    ['layout-row', 'layout', state.layout],
    ['grade-row', 'grade', state.grade],
    ['size-row', 'size', state.size],
  ]) {
    document.getElementById(rowId).querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset[key] === value);
    });
  }
  app.refreshPanelPicker();
  app.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
