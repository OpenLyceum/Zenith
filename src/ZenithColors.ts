/**
 * ZenithColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import ZenithColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import ZenithColors from "../../ZenithColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: ZenithColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the ZenithColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import ZenithNamespace from "./ZenithNamespace.js";

const ZenithColors = {
  /**
   * Background color for the planetarium screen.
   * Near-black night sky in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(ZenithNamespace, "background", {
    default: "#050814",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Starlight cyan in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(ZenithNamespace, "accent", {
    default: "#7ec8ff",
    projector: "#0a1628",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep indigo in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(ZenithNamespace, "panelBackground", {
    default: "#0d1528",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Soft navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(ZenithNamespace, "panelBorder", {
    default: "#1e3a5f",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(ZenithNamespace, "text", {
    default: "#e8eef8",
    projector: "#1a1a1a",
  }),

  /**
   * Fill for stars and bright sky markers on the planetarium dome.
   * Warm white in default mode; dark charcoal in projector mode.
   */
  starColorProperty: new ProfileColorProperty(ZenithNamespace, "star", {
    default: "#f4f7ff",
    projector: "#222222",
  }),

  /**
   * Horizon / ground tone beneath the planetarium FOV.
   * Deep silhouette in default mode; soft gray in projector mode.
   */
  horizonColorProperty: new ProfileColorProperty(ZenithNamespace, "horizon", {
    default: "#0a101c",
    projector: "#d0d0d0",
  }),

  /**
   * Night-sky fill for the first-person sky panel (above the horizon).
   * Used as the dark end of the solar-altitude twilight gradient.
   */
  skyPanelColorProperty: new ProfileColorProperty(ZenithNamespace, "skyPanel", {
    default: "#070b18",
    projector: "#e8eef8",
  }),

  /**
   * Night horizon tone near alt=0 in the twilight gradient.
   */
  skyNightHorizonColorProperty: new ProfileColorProperty(ZenithNamespace, "skyNightHorizon", {
    default: "#0c1424",
    projector: "#d0d8e8",
  }),

  /**
   * Daytime zenith blue when the Sun is well above the horizon.
   */
  skyDayZenithColorProperty: new ProfileColorProperty(ZenithNamespace, "skyDayZenith", {
    default: "#4a90d9",
    projector: "#9ec5f0",
  }),

  /**
   * Daytime horizon blue (lighter / hazier than zenith).
   */
  skyDayHorizonColorProperty: new ProfileColorProperty(ZenithNamespace, "skyDayHorizon", {
    default: "#a8c8e8",
    projector: "#c8daf0",
  }),

  /**
   * Warm civil-twilight horizon accent (sunrise / sunset cue).
   */
  skyTwilightHorizonColorProperty: new ProfileColorProperty(ZenithNamespace, "skyTwilightHorizon", {
    default: "#e09050",
    projector: "#d08040",
  }),

  /**
   * Ground band below the horizon line in the FOV panel (night).
   */
  groundColorProperty: new ProfileColorProperty(ZenithNamespace, "ground", {
    default: "#121820",
    projector: "#c8c8c8",
  }),

  /**
   * Daytime ground band below the horizon.
   */
  groundDayColorProperty: new ProfileColorProperty(ZenithNamespace, "groundDay", {
    default: "#3a4a38",
    projector: "#8a9a78",
  }),

  /** Label text for constellation names in the FOV. */
  constellationLabelColorProperty: new ProfileColorProperty(ZenithNamespace, "constellationLabel", {
    default: "#9ab8d8",
    projector: "#335577",
  }),

  /**
   * Alt/az grid lines in the FOV panel.
   */
  gridColorProperty: new ProfileColorProperty(ZenithNamespace, "grid", {
    default: "#5a7a9a",
    projector: "#666666",
  }),

  /** Tick labels on the alt/az grid (slightly brighter than the stroke). */
  gridLabelColorProperty: new ProfileColorProperty(ZenithNamespace, "gridLabel", {
    default: "#9bb8d4",
    projector: "#445566",
  }),

  /** Ecliptic line — the Sun's yearly path (warm gold). */
  eclipticColorProperty: new ProfileColorProperty(ZenithNamespace, "ecliptic", {
    default: "#e6c34d",
    projector: "#b38f1a",
  }),

  /** Celestial equator line (cool teal). */
  celestialEquatorColorProperty: new ProfileColorProperty(ZenithNamespace, "celestialEquator", {
    default: "#5ec8c8",
    projector: "#1f8a8a",
  }),

  /** Diurnal path of the selected object across the sky. */
  objectPathColorProperty: new ProfileColorProperty(ZenithNamespace, "objectPath", {
    default: "#8fe08f",
    projector: "#2f8a3f",
  }),

  // ── Solar-system body fills (from planets.ini RGB; projector = darkened) ─────
  sunColorProperty: new ProfileColorProperty(ZenithNamespace, "sun", {
    default: "#ffd966",
    projector: "#c4a000",
  }),
  moonColorProperty: new ProfileColorProperty(ZenithNamespace, "moon", {
    default: "#e8e4d0",
    projector: "#888888",
  }),

  /**
   * Unlit portion of the Moon disc (phase shadow).
   * Near-black in default mode; medium gray in projector mode for contrast.
   */
  moonShadowColorProperty: new ProfileColorProperty(ZenithNamespace, "moonShadow", {
    default: "#1a1e28",
    projector: "#4a4a4a",
  }),
  mercuryColorProperty: new ProfileColorProperty(ZenithNamespace, "mercury", {
    default: "#a8a8a8",
    projector: "#8a7a5a",
  }),
  venusColorProperty: new ProfileColorProperty(ZenithNamespace, "venus", {
    default: "#ffe08a",
    projector: "#b89a40",
  }),
  marsColorProperty: new ProfileColorProperty(ZenithNamespace, "mars", {
    default: "#e2542a",
    projector: "#a05020",
  }),
  jupiterColorProperty: new ProfileColorProperty(ZenithNamespace, "jupiter", {
    default: "#d8b48a",
    projector: "#9a8050",
  }),
  saturnColorProperty: new ProfileColorProperty(ZenithNamespace, "saturn", {
    default: "#e8d29a",
    projector: "#9a8540",
  }),
  uranusColorProperty: new ProfileColorProperty(ZenithNamespace, "uranus", {
    default: "#a8ecec",
    projector: "#4080a0",
  }),
  neptuneColorProperty: new ProfileColorProperty(ZenithNamespace, "neptune", {
    default: "#5070e0",
    projector: "#3040a0",
  }),

  /** Label text for planet name tags in the FOV. */
  planetLabelColorProperty: new ProfileColorProperty(ZenithNamespace, "planetLabel", {
    default: "#e8eef8",
    projector: "#1a1a1a",
  }),

  /** Label text for named bright stars in the FOV. */
  starLabelColorProperty: new ProfileColorProperty(ZenithNamespace, "starLabel", {
    default: "#c8d8f0",
    projector: "#333333",
  }),

  /** Stroke for constellation stick figures. */
  constellationColorProperty: new ProfileColorProperty(ZenithNamespace, "constellation", {
    default: "#6a90c0",
    projector: "#557799",
  }),

  /** Stroke for the local meridian overlay. */
  meridianColorProperty: new ProfileColorProperty(ZenithNamespace, "meridian", {
    default: "#90c0e8",
    projector: "#336699",
  }),

  /** Stroke for the equatorial RA/Dec grid. */
  equatorialGridColorProperty: new ProfileColorProperty(ZenithNamespace, "equatorialGrid", {
    default: "#3a5a7a",
    projector: "#8899aa",
  }),

  /** Tick labels on the equatorial RA/Dec grid (slightly brighter than the stroke). */
  equatorialGridLabelColorProperty: new ProfileColorProperty(ZenithNamespace, "equatorialGridLabel", {
    default: "#7aa0c0",
    projector: "#445566",
  }),

  /** Highlight ring around the selected sky object. */
  selectionColorProperty: new ProfileColorProperty(ZenithNamespace, "selection", {
    default: "#ffd060",
    projector: "#b07000",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(ZenithNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(ZenithNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(ZenithNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Observer-location mini-map ───────────────────────────────────────────────
  // Schematic Earth used to drag the observer's latitude / longitude.

  /** Ocean fill of the observer-location mini-map. */
  earthOceanColorProperty: new ProfileColorProperty(ZenithNamespace, "earthOcean", {
    default: "#12325a",
    projector: "#bcd6f0",
  }),

  /** Land (continent) fill of the observer-location mini-map. */
  earthLandColorProperty: new ProfileColorProperty(ZenithNamespace, "earthLand", {
    default: "#2f6b41",
    projector: "#7cae82",
  }),

  /** Graticule (equator / prime-meridian / grid) lines on the mini-map. */
  earthGraticuleColorProperty: new ProfileColorProperty(ZenithNamespace, "earthGraticule", {
    default: "#5a7ba6",
    projector: "#6b8fb5",
  }),

  /** Draggable observer-location pin on the mini-map. */
  locationPinColorProperty: new ProfileColorProperty(ZenithNamespace, "locationPin", {
    default: "#ff5a4d",
    projector: "#d5342a",
  }),

  /** Stroke around the observer-location pin dot, so the marker stays visible on land and ocean. */
  locationPinStrokeColorProperty: new ProfileColorProperty(ZenithNamespace, "locationPinStroke", {
    default: "#ffffff",
    projector: "#ffffff",
  }),
};

export default ZenithColors;
