# Zenith

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

A SceneryStack **first-person planetarium** for the night sky — look around from
an Earth observer, set latitude and FOV, and watch stars and planets move with
civil time. Built with [SceneryStack](https://scenerystack.org/),
Vite 8, TypeScript 7, and Biome 2.

## Features

- First-person FOV with pan (drag / arrows), FOV zoom (scroll / slider), and Ctrl-time
- Click or N/P-cycle a named star or planet for magnitude, RA/Dec, and alt/az readout
- Twilight sky gradient from solar altitude (stars fade in daylight); toggle atmosphere off for a permanent night sky
- Location presets and longitude control (Boulder, Greenwich, poles, equator, Sydney)
- Date/time presets for solstices and equinoxes
- Bright-star catalog (~4100 stars, mag ≤ 5.8) with magnitude limit and name labels
- Full IAU constellation stick figures and names (all 88)
- Cardinals, zenith, meridian, and optional equatorial RA/Dec grid overlays
- Sun, Moon, and Mercury–Neptune via `astronomy-engine` ephemerides (Sun/Moon discs have a minimum visible size and become true-scale when zoomed in; optional exaggerated angular-size planets)
- Observer latitude/longitude, civil UTC time, and derived local sidereal time with play / pause / speed
- English, Spanish, and French localization via `StringManager`
- Deep-link startup via query params (`lat`, `lon`, `date` — 1900–2100, `fov`, `magLimit`)
- Optional "Use my location": browser geolocation only, requested when the button is pressed.
  Nothing is sent at startup, no third-party service is contacted, and the sim runs fully offline.
- Default (night-sky) and projector color profiles
- Progressive Web App (installable, offline-capable)
- Git hooks for Biome pre-commit checks
- Shared GitHub Actions CI via `OpenLyceum/Baton`

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

Deep-link example for a Sydney summer-solstice activity:

`http://localhost:5173/?lat=-33.9&lon=151.2&date=2024-12-21T10:00:00Z&fov=60&magLimit=4`
## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (includes memory-leak suite) |
| `npm run test:fuzz` | Optional Playwright fuzz smoke: pointer (`?fuzz`) + keyboard (`?fuzzBoard`), with `?ea`, 30s each |
| `npm run test:fuzz -- 90` | Same fuzz for 90 seconds (`--duration 90` or `FUZZ_DURATION=90` also work) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run test:fuzz:long` | Longer fuzz smoke (300s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run release` | `check && lint && build && test`, then version patch + push tags |
| `npm run clean` | Remove `dist/` |

New sims start at `version: "0.0.0"` in `package.json`. Bump only when cutting a release (for example `npm version patch` and a matching git tag). Keep `name` in kebab-case; it is separate from the SceneryStack sim identifier in `src/init.ts`, which reads its `version` from `package.json`.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenLyceum org license](https://github.com/OpenLyceum/.github/blob/main/LICENSE).

## Contributing

See [OpenLyceum contributing guidelines](https://github.com/OpenLyceum/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
