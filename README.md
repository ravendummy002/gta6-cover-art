# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ravendummy002/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ravendummy002/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Coast Cover Studio: an offline web app that turns your own photos and a caption into multi-panel GTA-style cover art, exported as a PNG to share. Four layouts (full bleed, four-panel grid, hero-and-three, tilted snapshots), five colour grades (Sunset, Neon night, Teal heat, Noir, Palm gold), per-panel crop and position by dragging, bold gradient title lettering with a subtitle and badge, film grain and vignette, and exports at 1080 x 1080, 1080 x 1350 and 1920 x 1080. Everything runs in the browser from static files — your photos never leave the machine, and all art and lettering is original.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=r16q3s2q&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

## Features

- **Any photo:** upload your own photos (or try the two built-in samples), fill several panels with one photo or several, and crop and position each panel by dragging, with a zoom slider.
- **Four layouts:** full bleed, a four-panel grid, hero-and-three, and tilted snapshots scattered like prints on a table.
- **Five grades:** Sunset, Neon night, Teal heat, Noir and Palm gold, each a gradient-map grade applied per panel.
- **Lettering:** an editable title in bold condensed capitals with a sunset gradient, an italic subtitle, and a rotated badge pill.
- **Fast export:** one click exports the current size as a PNG, or all three post sizes at once (1080 x 1080, 1080 x 1350, 1920 x 1080).
- **Fully offline:** vanilla HTML, CSS and JavaScript, no libraries and no network requests.

## Build the dossier

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` to `out/` and writes `out/dossier.json` with the vendored make.fun library.
