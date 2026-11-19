// Neon Coast Cover Studio, a gta6-cover-art-01 entry (Node 22, standard library only): the app is this
// directory's app/ folder, plain static files a desktop browser loads offline (app/index.html and its ES
// modules, no library and no network request), and this program hands it in. It copies app/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. The app turns a person's own photos and a caption into multi-panel GTA-style
// cover art: four layouts (full bleed, four-panel grid, hero-and-three, tilted snapshots), five colour grades
// (Sunset, Neon night, Teal heat, Noir, Palm gold), per-panel crop and position by dragging, bold gradient
// title lettering with a subtitle and badge, film grain and vignette, and PNG exports at 1080 x 1080,
// 1080 x 1350 and 1920 x 1080. Its two sample photos (app/samples/) were made for make.fun with an image
// model and are free to use; screenshots/ holds four fresh renders of the app (the first by name is the cover).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
// Screenshots are named so the cover sorts first: 1-cover.jpg is the exported landscape cover
// (hero layout, neon grade), 2-editor.jpg the editor with photos loaded, 3-cover.jpg a portrait
// cover and 4-cover.jpg the tilted-snapshots layout. All four are fresh headless-Chromium renders.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
