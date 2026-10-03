# Implementation Notes — Zenith (for developers)

Developer guide to architecture, model state, projection, and extension points.
For the pedagogical / classroom description of what the sim models, see
[model.md](./model.md). Template multi-screen patterns:
[SceneryStackTemplate `doc/multi-screen.md`](https://github.com/OpenLyceum/SceneryStackTemplate/blob/main/doc/multi-screen.md).

---

## Architecture overview

Zenith is a SceneryStack **first-person planetarium**. `ZenithModel` owns
observer location, civil time (with derived LST), look/FOV, display toggles, and
object selection. The view projects the bright-star catalog, named-star labels,
constellation stick figures, solar-system discs, and coordinate overlays into a
rectangular sky panel.

```
main.ts
  └─ ZenithScreen
       ├─ ZenithModel          observer + civil clock + look/FOV + overlays + selection
       └─ ZenithScreenView
            ├─ PlanetariumSkyNode          (FOV: stars + overlays + labels)
            │    ├─ CelestialLinesNode     (coordinates, ecliptic, object paths)
            │    └─ PlanetariumPlanetsNode (Sun/Moon/planets)
            ├─ SelectedObjectReadout       (bottom-left; includes Track checkbox)
            ├─ ObjectNameSearch            (top-center type-ahead)
            ├─ AccordionBox × 3            (Location | Time | Display)
            ├─ attachPlanetariumInteraction
            ├─ TimeControlPanel            (CivilDateTimeControl, rate ladder, sidereal ±1)
            ├─ ObserverLocationNode        (map + lat/lon + geolocation)
            ├─ ZenithInfoDialogContent     (ⓘ usage tips)
            ├─ ZenithScreenSummaryContent
            └─ ZenithKeyboardHelpContent

src/zenith-screen/model/objectSearch.ts     search ranking (unit-tested)
src/common/resolveObserverLocation.ts       browser geolocation (no IP fallback)
src/common/ZenithControlOptions.ts          shared control theming
src/zenith-screen/model/EarthShoreData.ts   location-panel coastline

src/common/sky/SkyCoordinates.ts   equatorial ↔ horizontal (+ rise/set/transit)
src/common/sky/EclipticCoordinates.ts  equatorial ↔ ecliptic
src/common/sky/PlanetEphemeris.ts  astronomy-engine wrapper
src/common/sky/SkyTwilight.ts      sky color from solar altitude
src/common/sky/civilDateTime.ts    UTC ↔ local-solar time formatting
src/common/sky/moonPhaseShape.ts   Illuminated-disc terminator glyph (Moon + phased planets)
src/zenith-screen/model/BrightStarCatalog.ts
src/zenith-screen/model/DeepStarCatalog.ts
src/zenith-screen/model/NamedBrightStars.ts
src/zenith-screen/model/ConstellationLines.ts
src/zenith-screen/model/LocationPreset.ts
src/zenith-screen/model/EpochPreset.ts
src/zenith-screen/model/SolarSystemBodies.ts
src/zenith-screen/model/SelectedSkyObject.ts
src/zenith-screen/view/SkyProjection.ts
src/zenith-screen/view/CelestialLinesNode.ts
src/zenith-screen/view/TimeControlPanel.ts
src/zenith-screen/view/ObserverLocationNode.ts
../Baseline/Astronomy/stellarium-web-engine/   (OpenLyceum/Baseline; run fetch-baselines.sh)
```

Inspired by Stellarium Web Engine’s observer → frame → project path, implemented
in TypeScript with Scenery nodes (no WASM / HiPS). Planet positions use
`astronomy-engine`; visual colors/radii follow Stellarium `planets.ini`.

---

## Model state (`ZenithModel`)

| Property | Units | Notes |
|---|---|---|
| `timer.isPlayingProperty` | — | Play/pause for sky motion (`TimeModel`; **starts playing** at 1×) |
| `timer.timeProperty` | s | Elapsed simulation time |
| `timeRateIndexProperty` | Integer | Index into the discrete signed playback rate ladder |
| `timeRateProperty` | derived multiplier | Signed playback rate multiplier (can be negative for reverse time) |
| `locationPresetProperty` | LocationPreset | Named sites; `CUSTOM` when lat/lon scrubbed |
| `epochPresetProperty` | EpochPreset | Solstice/equinox jumps; `CUSTOM` when time advances |
| `latitudeProperty` | degrees (+N) | Observer latitude |
| `longitudeProperty` | degrees (+E) | Observer longitude |
| `civilTimeMsProperty` | ms (UTC epoch) | Advances while playing; drives ephemerides |
| `localSiderealTimeHoursProperty` | hours `[0, 24)` | Derived (via `skySnapshotProperty`) from GMST + longitude |
| `lookAzimuthDegProperty` | degrees (N→E) | FOV center azimuth |
| `lookAltitudeDegProperty` | degrees | FOV center altitude `[-90, 90]` (clamped to `[0, 90]` when horizon is shown) |
| `fieldOfViewDegProperty` | degrees | Horizontal FOV |
| `showGridProperty` | — | Alt/az grid + tick labels |
| `showCardinalsProperty` | — | N/S/E/W labels + zenith marker |
| `showMeridianProperty` | — | Local meridian arcs |
| `showEquatorialGridProperty` | — | Coarse RA/Dec grid + tick labels |
| `showHorizonProperty` | — | Ground band + horizon line |
| `showAtmosphereProperty` | — | Twilight sky colors + daytime star fade |
| `showPlanetsProperty` | — | Sun / Moon / planets |
| `trueScaleBodiesProperty` | — | Planet discs use exaggerated angular size + inner-planet phases; Sun/Moon use real angular size above minimum visible radii |
| `showPlanetLabelsProperty` | — | Name tags (also Preferences; survives Reset All) |
| `showStarLabelsProperty` | — | Curated bright-star name tags (Preferences) |
| `showConstellationsProperty` | — | Stick figures (Preferences) |
| `deepStarCatalogProperty` | — | When true, **replaces** bright catalog at render (Preferences) |
| `showEclipticProperty` | — | Whether the ecliptic great circle is drawn |
| `showCelestialEquatorProperty` | — | Whether the celestial equator great circle is drawn |
| `showObjectPathProperty` | — | Whether the selected object's 24 h diurnal path is drawn |
| `magnitudeLimitProperty` | mag | Cull fainter catalog stars |
| `selectedObjectProperty` | SelectedSkyObject \| null | Click/keyboard-selected star or planet |
| `trackSelectedObjectProperty` | — | When true, camera tracks/centers on the selected object |
| `measureStartProperty` | EquatorialCoordinates \| null | First endpoint of angular measurement tool |
| `measureEndProperty` | EquatorialCoordinates \| null | Second endpoint of angular measurement tool |
| `measureSeparationDegProperty` | degrees \| null | Derived angular separation between endpoints |
| `skySnapshotProperty` | SkySnapshot | Derived instantaneous ephemeris snapshot of solar-system bodies |
| `solarAltitudeDegProperty` | degrees | Derived; drives twilight sky + star fade |

Defaults (Boulder, CO; look south; epoch `2024-06-21 18:00 UTC`) and ranges live
in `src/ZenithConstants.ts`. Named location / epoch tables:
`LocationPreset.ts`, `EpochPreset.ts`. Startup deep-links:
`src/preferences/zenithQueryParameters.ts`.

### Step / reset

- `step(dt)` advances `TimeModel` and civil time by
  `dt × CIVIL_HOURS_PER_SIM_SECOND × timeRate`, then resyncs LST.
- `advanceSiderealTime` — Ctrl-drag, Ctrl+arrows, ±1 sidereal-day buttons (stars move 1:1 with gesture).
- `advanceCivilTimeHours` — available for explicit civil jumps; not used for Ctrl-drag.
- `reset()` restores every Property and the timer (including presets, rate index,
  and selection). Preference-backed overlays that live in Preferences
  (`showStarLabels`, `showConstellations`, `showPlanetLabels`, `deepStarCatalog`)
  are **not** cleared by Reset All.

---

## Projection pipeline

1. Catalog star, named star, constellation endpoint, or planet (RA hours, Dec
   degrees; catalog/named and planet ephemeris inputs are J2000; constellation
   HIPs are Hipparcos J1991.25). Precess J2000 directions to the mean equator of
   the display date using one cached IAU 1976 rotation matrix per epoch.
2. `equatorialToHorizontal(ra, dec, lat, lst)` → alt/az in the mean-of-date frame
3. Map to panel pixels via `SkyProjection` (which implements an azimuthal
   stereographic/fisheye projection). The look direction defines a camera basis
   (forward $F$, screen right, screen up). A sky point's unit vector is expressed
   in that basis $(x, y, z)$ with $z$ toward the view center, then projected:
   $$sx = cx + \frac{2 \cdot focal \cdot x}{1 + z}$$
   $$sy = cy - \frac{2 \cdot focal \cdot y}{1 + z}$$
   so $z = 1$ (the view center) maps to the screen center $(cx, cy)$.
4. Cull if the point lies behind the camera (specifically, farther than
   `PROJECTION_CULL_DEG` or $150^\circ$ from the view center, where the projection
   diverges to infinity), or below the horizon (when the horizon is shown and
   the object is below altitude 0°).

LST is GMST (UTC approximates UT1) plus longitude. Mean sidereal time is paired
with mean-of-date coordinates; apparent sidereal time would require nutation.

Sun and Moon discs use apparent angular diameter vs FOV (degrees → pixels)
when that exceeds their minimum visible pixel radii; zooming in reveals their
true angular size. When `trueScaleBodiesProperty` is off, planets use
magnitude-based (brightness) disc radii. When it is on, planets are sized from
their real angular diameter scaled by a fixed exaggeration factor — so a disc
visibly grows and shrinks with the body's distance to Earth — and Mercury,
Venus, and Mars gain an illuminated-phase terminator (`discUnlitShape`). The
Moon's phase is always drawn regardless of the setting.

Sky color follows solar altitude (day → twilight → night) when atmosphere is on.
Stars, star labels, and constellation figures fade as the Sun rises. Atmosphere
off keeps a night sky with stars fully visible.

---

## Catalogs / ephemeris

| Module | Role |
|---|---|
| `BrightStarCatalog.ts` | ~4103 stars (mag ≤ 5.8), flat RA/Dec/mag arrays (J2000) |
| `DeepStarCatalog.ts` | ~25,700 stars (mag ≤ 7.5), flat RA/Dec/mag arrays (J2000) |
| `NamedBrightStars.ts` | Curated classroom stars for labels and selection |
| `ConstellationLines.ts` | Stick-figure segments for all 88 IAU constellations (Stellarium western culture; HIP-keyed) |
| `PlanetEphemeris.ts` | `astronomy-engine` wrapper: Sun, Moon, Mercury–Neptune (mean equatorial of date, mag, distance, per-body phase fraction + lit side, angular diameter) |
| `SolarSystemBodies.ts` | Display metadata (color, exaggerated disc clamps, physical radius) from `planets.ini` |

Shared transform: `equatorialToHorizontal` in `src/common/sky/SkyCoordinates.ts`.
`PlanetEphemeris.ts` is the only `astronomy-engine` import boundary; the rest of
`src/common/sky/` is intentionally hand-rolled for per-frame throughput and
mean-of-date frame consistency. Keep that boundary; do not replace the hand-rolled transforms
with direct `astronomy-engine` calls.

---

## Interaction

Wired in `attachPlanetariumInteraction` and control-panel listeners:

| Input | Effect |
|---|---|
| Drag / arrows | Pan look az/alt |
| Ctrl-drag / Ctrl+arrows | **Advance sidereal time** (`advanceSiderealTime`; civil clock follows ~1/1.0027×) |
| Shift-click | Measure angular distance between two points |
| Click (small motion) | Select nearest **named** star or planet (38 + 9 bodies) |
| N / P | Cycle selectable named objects in the FOV |
| Escape | Clear selection and the angular-measurement tool |
| T | Toggle tracking of selected object |
| + / − (or scroll wheel) | Change FOV |
| J / K / L | Adjust time rate (slower/reverse · normal `1×` · faster/forward) |
| Shift + + / Shift + − | Advance / rewind one sidereal day (hold to sweep) |
| Shift + N/S/E/W/Z | Quick-look North, South, East, West, or Zenith |
| A / G / Q / Z / E / M | Toggle Atmosphere, Horizon, Cardinals, Grid, Equatorial grid, Meridian |
| Location ComboBox | Jump observer site |
| Epoch ComboBox | Jump civil epoch |
| Year / month / day / hour NumberControls | Arbitrary UTC civil jump → epoch `CUSTOM` |
| Checkboxes (Display panel) | Alt/az grid, cardinals, meridian, RA/Dec grid, horizon, planets, atmosphere, distance-scaled planet discs, ecliptic, celestial equator, selected object path |
| SelectedObjectReadout | **Track selected object** checkbox (not in Display panel) |
| Preferences → Simulation | Star names, constellation lines, planet names, deeper star catalog (also seedable via query params) |

Keyboard Shortcuts (`?`) come from `ZenithKeyboardHelpContent` / `ZenithHotkeyData`.

### Selection details

`SelectedObjectReadout` reacts to `selectedObjectProperty`: name, magnitude,
RA/Dec, alt/az, IAU constellation name, object type, **solar elongation** (planets/Moon), plus
**rise / set / transit** event times. Times are
computed by `riseSetInfo` (`SkyCoordinates.ts`) for fixed stars. For moving
bodies, the initial estimate is refined against ephemerides at each estimated
event time. Events cross geometric altitude 0° (rise/set) or the meridian
(transit), then are reported
both as a "time-from-now" duration and a local-solar clock string. Circumpolar
and never-rises objects get a note instead (transit is still shown for
circumpolar stars). The readout also hosts the **Track selected object**
checkbox (enabled only while something is selected).

---

## Deep-link query parameters

Public startup params in `zenithQueryParameters.ts` seed `ZenithModel` (and
overlay preferences where noted):

| Param | Meaning | Example |
|---|---|---|
| `lat` | Observer latitude (°N) | `?lat=-33.9` |
| `lon` | Observer longitude (°E) | `&lon=151.2` |
| `date` | Civil UTC (`Date.parse` / ISO-8601) | `&date=2024-12-21T10:00:00Z` |
| `fov` | Horizontal FOV (°) | `&fov=60` |
| `magLimit` | Faintest visible magnitude | `&magLimit=4` |
| `showStarLabels` | Star name labels (also Preferences) | `&showStarLabels=false` |
| `showConstellations` | Stick figures (also Preferences) | `&showConstellations=true` |
| `showPlanetLabels` | Planet labels (also Preferences) | `&showPlanetLabels=false` |
| `deepStarCatalog` | Deeper Hipparcos star catalog (also Preferences) | `&deepStarCatalog=true` |

Example classroom link:

`index.html?lat=-33.9&lon=151.2&date=2024-12-21T10:00:00Z&fov=60&magLimit=4`

---

## Testing

`npm test` covers `ZenithModel`, `BrightStarProjection`, `objectSearch`, keyboard shortcuts, and
memory-leak regression.

## Deferred

- Saturn rings
- Planetary moons, eclipses, HiPS imagery
