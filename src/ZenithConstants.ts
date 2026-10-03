/**
 * ZenithConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Angles for observer location and sky coordinates use degrees unless noted.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in ZenithColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Dimension2, Range } from "scenerystack/dot";
import ZenithNamespace from "./ZenithNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Horizontal padding inside control panels. */
export const PANEL_X_MARGIN = 12;

/** Vertical padding inside control panels. */
export const PANEL_Y_MARGIN = 10;

/** Default font size (px) for labels on panel controls. */
export const CONTROL_FONT_SIZE = 12;

/** Font size (px) for bold panel section titles. */
export const PANEL_TITLE_FONT_SIZE = 12;

/** Side length (px) of checkbox boxes in control panels. */
export const CHECKBOX_BOX_WIDTH = 16;

/** Default vertical spacing between children inside a panel VBox. */
export const PANEL_CONTENT_SPACING = 6;

/** Track size for NumberControl sliders. */
export const NUMBER_CONTROL_SLIDER_TRACK_SIZE = new Dimension2(140, 3);

/** Thumb size shared by panel sliders and NumberControl sliders. */
export const SLIDER_THUMB_SIZE = new Dimension2(13, 26);

/** Width reserved for the right-hand control panel (px). */
export const CONTROL_PANEL_WIDTH = 250;

// ── Observer / sky defaults ───────────────────────────────────────────────────

/** Default observer latitude (degrees, +N). Boulder, CO ≈ 40° N. */
export const DEFAULT_LATITUDE_DEG = 40;

/** Default observer longitude (degrees, +E). Boulder, CO ≈ 105° W. */
export const DEFAULT_LONGITUDE_DEG = -105;

/** Allowed observer latitude range (degrees). */
export const LATITUDE_RANGE = new Range(-90, 90);

/** Allowed observer longitude range (degrees). */
export const LONGITUDE_RANGE = new Range(-180, 180);

/** Arrow-key nudge (degrees) when dragging the observer pin on the location map. */
export const LOCATION_STEP_DEGREES = 5;

/**
 * Hours of civil (and roughly sidereal) time advanced per second of simulation
 * clock at the base `1×` rate. Real-time: one wall-clock second advances civil
 * time by one second (1/3600 h). The {@link TIME_RATE_MULTIPLIERS} ladder scales
 * this up so diurnal motion becomes visible at higher rates.
 */
export const CIVIL_HOURS_PER_SIM_SECOND = 1 / 3600;

/** Hours in one sidereal day. */
export const HOURS_PER_SIDEREAL_DAY = 24;

/**
 * Sidereal hours advanced per solar (civil) hour. One mean solar day is
 * 1.00273790935 sidereal days, so local sidereal time runs this much faster
 * than the civil clock. Used to convert a requested sidereal-time advance into
 * the civil-time step that produces it.
 */
export const SIDEREAL_HOURS_PER_SOLAR_HOUR = 1.00273790935;

/** Stop refining a moving body's event when successive estimates differ by under 30 s. */
export const BODY_EVENT_TOLERANCE_MS = 30000;

/** Maximum ephemeris refinements per rise, set, or transit prediction. */
export const BODY_EVENT_MAX_ITERATIONS = 6;

/**
 * Default civil epoch: 2024-06-21 18:00 UTC (≈ noon MDT, summer solstice).
 * Documented for ephemeris tests and Reset All.
 */
export const DEFAULT_CIVIL_TIME_MS = Date.UTC(2024, 5, 21, 18, 0, 0);

/** Allowed UTC year range for the civil date jump NumberControls. */
export const CIVIL_YEAR_RANGE = new Range(1900, 2100);

/** Calendar month range (1–12) for the civil date jump UI. */
export const CIVIL_MONTH_RANGE = new Range(1, 12);

/** Day-of-month range (1–31); enabled sub-range follows daysInUtcMonth. */
export const CIVIL_DAY_RANGE = new Range(1, 31);

/** UTC hour-of-day range for the civil date jump UI. */
export const CIVIL_HOUR_RANGE = new Range(0, 23);

/**
 * Supported span of civil time in UTC milliseconds, derived from
 * {@link CIVIL_YEAR_RANGE}. This is the authoritative bound: the date-jump
 * spinners, the `date` deep-link parameter, and clock playback are all held
 * inside it, so the Year spinner can never display a value outside its own
 * range and a shared link can never resolve to an epoch the UI cannot express.
 */
export const CIVIL_TIME_MS_RANGE = new Range(
  Date.UTC(CIVIL_YEAR_RANGE.min, 0, 1, 0, 0, 0),
  Date.UTC(CIVIL_YEAR_RANGE.max, 11, 31, 23, 0, 0),
);

/**
 * Discrete time-rate ladder: each value multiplies the base educational rate
 * {@link CIVIL_HOURS_PER_SIM_SECOND}. Symmetric with no zero, so stepping the
 * rate down past `1×` crosses straight into reverse (`−1×`) and then rewinds
 * faster and faster; stepping up walks it back toward, and past, forward play.
 */
export const TIME_RATE_MULTIPLIERS: readonly number[] = [
  -30000, -10000, -3000, -1000, -300, -100, -30, -10, -3, -1, 1, 3, 10, 30, 100, 300, 1000, 3000, 10000, 30000,
];

/** Index into {@link TIME_RATE_MULTIPLIERS} for the default rate (`1×`, normal forward). */
export const DEFAULT_TIME_RATE_INDEX = TIME_RATE_MULTIPLIERS.indexOf(1);

/** Valid index range for the time-rate ladder. */
export const TIME_RATE_INDEX_RANGE = new Range(0, TIME_RATE_MULTIPLIERS.length - 1);

// ── Aim-able first-person sky camera (stereographic projection) ───────────────

/** Default look azimuth (degrees from North through East). Due south. */
export const DEFAULT_LOOK_AZIMUTH_DEG = 180;

/**
 * Default look altitude at the view center (degrees). Tilted well up so the
 * horizon sinks toward the bottom of the frame — this is a star-gazing view, so
 * most of the panel goes to the sky rather than the ground. The zenith stays in
 * frame at the default (wide) field of view.
 */
export const DEFAULT_LOOK_ALTITUDE_DEG = 30;

/** Allowed look-altitude range (degrees): nadir-centered (looking straight down) up to zenith-centered. */
export const LOOK_ALTITUDE_RANGE = new Range(-90, 90);

/** Default horizontal field of view (degrees) — a wide fisheye. */
export const DEFAULT_FIELD_OF_VIEW_DEG = 140;

/** Allowed horizontal FOV range (degrees). */
export const FIELD_OF_VIEW_RANGE = new Range(5, 180);

/**
 * Sky directions farther than this from the view center (degrees) are culled;
 * near the antipode the stereographic projection diverges to infinity.
 */
export const PROJECTION_CULL_DEG = 150;

/** Default magnitude cull — fainter stars are hidden. */
export const DEFAULT_MAGNITUDE_LIMIT = 5.5;

/**
 * Faintest visual magnitude in the deeper (Hipparcos) star catalog. Used as the
 * upper bound of {@link MAGNITUDE_LIMIT_RANGE} and to document the catalog depth.
 */
export const DEEP_STAR_CATALOG_MAG_LIMIT = 7.5;

/**
 * Faintest magnitude reachable on the magnitude-limit slider. Matches the deep
 * Hipparcos catalog's cutoff (DeepStarCatalog), so enabling the deeper catalog
 * in Preferences reveals stars down to this limit. The bundled BrightStarCatalog
 * only reaches mag 5.8, so the range above 5.8 has no effect until the deeper
 * catalog is turned on.
 */
export const MAGNITUDE_LIMIT_RANGE = new Range(1, DEEP_STAR_CATALOG_MAG_LIMIT);

/** Default: brighter catalog only (BrightStarCatalog, mag <= 5.8). */
export const DEFAULT_DEEP_STAR_CATALOG = false;

/** Degrees of look pan per pixel of pointer drag. */
export const LOOK_PAN_DEG_PER_PIXEL = 0.2;

/** Degrees of look pan per keyboard arrow press. */
export const LOOK_PAN_KEYBOARD_STEP_DEG = 3;

/** Sidereal hours advanced per pixel of Ctrl-drag. */
export const TIME_DRAG_HOURS_PER_PIXEL = 0.02;

/** Sidereal hours advanced per Ctrl+arrow press. */
export const TIME_KEYBOARD_STEP_HOURS = 0.25;

/** Field-of-view change (degrees) per keyboard zoom keypress. */
export const FOV_KEYBOARD_STEP_DEG = 5;

/** Quick-look cardinal azimuths (degrees from North through East). */
export const LOOK_NORTH_AZIMUTH_DEG = 0;
export const LOOK_EAST_AZIMUTH_DEG = 90;
export const LOOK_SOUTH_AZIMUTH_DEG = 180;
export const LOOK_WEST_AZIMUTH_DEG = 270;

/** Quick-look altitude (degrees) aimed at the zenith. */
export const LOOK_ZENITH_ALTITUDE_DEG = 90;

/** Brightest star screen radius (px). */
export const STAR_RADIUS_MAX = 4.5;

/** Faintest visible star screen radius (px). */
export const STAR_RADIUS_MIN = 0.6;

/** Magnitude used as the bright end of radius scaling. */
export const STAR_MAG_BRIGHT = -1.5;

/** Default: draw twilight sky colors and wash out daytime stars. */
export const DEFAULT_SHOW_ATMOSPHERE = false;

/** Default: draw Sun / Moon / planets in the FOV. */
export const DEFAULT_SHOW_PLANETS = true;

/**
 * Default: planets use exaggerated (magnitude-based) discs. Sun and Moon use
 * their angular diameter above visibility floors; planet true-scale mode uses
 * an exaggerated angular diameter.
 */
export const DEFAULT_TRUE_SCALE_BODIES = false;

/**
 * Floor for angularly sized discs (px) so true-scale planets remain a speck at
 * wide FOV instead of vanishing entirely.
 */
export const MIN_ANGULAR_DISC_RADIUS_PX = 0.75;

/** Default: draw name labels for preferred bodies. */
export const DEFAULT_SHOW_PLANET_LABELS = true;

/** Default: draw curated bright-star name labels. */
export const DEFAULT_SHOW_STAR_LABELS = true;

/** Default: draw N/S/E/W (+ intercardinals) and zenith marker. */
export const DEFAULT_SHOW_CARDINALS = true;

/** Horizon altitude (degrees) used for cardinal direction labels. */
export const CARDINAL_LABEL_ALTITUDE_DEG = 2;

/** Default: draw the alt/az grid (the primary grid). */
export const DEFAULT_SHOW_GRID = true;

/** Default: draw the ground band and horizon line. */
export const DEFAULT_SHOW_HORIZON = true;

/** Default: draw the local meridian arc. */
export const DEFAULT_SHOW_MERIDIAN = true;

/** Default: equatorial RA/Dec grid off (alt/az grid remains the primary grid). */
export const DEFAULT_SHOW_EQUATORIAL_GRID = false;

/** Default: constellation stick figures off until the learner enables them. */
export const DEFAULT_SHOW_CONSTELLATIONS = false;

/** Default: ecliptic line off until the learner enables it. */
export const DEFAULT_SHOW_ECLIPTIC = false;

/** Default: celestial equator off until the learner enables it. */
export const DEFAULT_SHOW_CELESTIAL_EQUATOR = false;

/** Default: the selected object's diurnal path off until the learner enables it. */
export const DEFAULT_SHOW_OBJECT_PATH = false;

/** Ecliptic / celestial-equator great circles are sampled every this many degrees. */
export const CELESTIAL_LINE_SAMPLE_STEP_DEG = 4;

/** The selected object's diurnal path is sampled every this many degrees of hour angle. */
export const OBJECT_PATH_SAMPLE_STEP_DEG = 4;

/** Max screen-pixel distance for click-to-select a sky object. */
export const SELECTION_HIT_RADIUS_PX = 18;

/** Alt/az grid: altitude parallel step (degrees). */
export const ALT_AZ_GRID_ALT_STEP_DEG = 15;

/** Alt/az grid: azimuth meridian step (degrees). */
export const ALT_AZ_GRID_AZ_STEP_DEG = 15;

/** Alt/az grid altitude extent for parallels and tick labels (degrees). */
export const ALT_AZ_GRID_ALT_MIN_DEG = -15;
export const ALT_AZ_GRID_ALT_MAX_DEG = 90;

/** Equatorial grid: RA step in hours. */
export const EQUATORIAL_GRID_RA_STEP_HOURS = 2;

/** Equatorial grid: Dec step in degrees. */
export const EQUATORIAL_GRID_DEC_STEP_DEG = 15;

/** Equatorial grid Dec extent for hour-circle polylines and RA tick labels (degrees). */
export const EQUATORIAL_GRID_DEC_MIN_DEG = -80;
export const EQUATORIAL_GRID_DEC_MAX_DEG = 80;

/** Equatorial grid Dec extent for parallel lines and Dec tick labels (degrees). */
export const EQUATORIAL_GRID_PARALLEL_DEC_MIN_DEG = -60;
export const EQUATORIAL_GRID_PARALLEL_DEC_MAX_DEG = 60;

ZenithNamespace.register("ZenithConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  CONTROL_FONT_SIZE,
  CONTROL_PANEL_WIDTH,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  CIVIL_HOURS_PER_SIM_SECOND,
  HOURS_PER_SIDEREAL_DAY,
  DEFAULT_CIVIL_TIME_MS,
  CIVIL_YEAR_RANGE,
  CIVIL_TIME_MS_RANGE,
  CIVIL_MONTH_RANGE,
  CIVIL_DAY_RANGE,
  CIVIL_HOUR_RANGE,
  DEFAULT_LOOK_AZIMUTH_DEG,
  DEFAULT_LOOK_ALTITUDE_DEG,
  DEFAULT_FIELD_OF_VIEW_DEG,
  DEFAULT_MAGNITUDE_LIMIT,
  DEFAULT_SHOW_ATMOSPHERE,
  DEFAULT_SHOW_PLANETS,
  DEFAULT_TRUE_SCALE_BODIES,
  MIN_ANGULAR_DISC_RADIUS_PX,
  DEFAULT_SHOW_PLANET_LABELS,
  DEFAULT_SHOW_STAR_LABELS,
  DEFAULT_SHOW_CARDINALS,
  CARDINAL_LABEL_ALTITUDE_DEG,
  DEFAULT_SHOW_GRID,
  DEFAULT_SHOW_HORIZON,
  DEFAULT_SHOW_MERIDIAN,
  DEFAULT_SHOW_EQUATORIAL_GRID,
  DEFAULT_SHOW_CONSTELLATIONS,
  SELECTION_HIT_RADIUS_PX,
});
