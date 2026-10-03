/**
 * zenithQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in ZenithPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?lat=-33.9&showConstellations=true` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import {
  CIVIL_TIME_MS_RANGE,
  DEFAULT_CIVIL_TIME_MS,
  DEFAULT_DEEP_STAR_CATALOG,
  DEFAULT_FIELD_OF_VIEW_DEG,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  DEFAULT_MAGNITUDE_LIMIT,
  DEFAULT_SHOW_CONSTELLATIONS,
  DEFAULT_SHOW_PLANET_LABELS,
  DEFAULT_SHOW_STAR_LABELS,
  FIELD_OF_VIEW_RANGE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  MAGNITUDE_LIMIT_RANGE,
} from "../ZenithConstants.js";
import ZenithNamespace from "../ZenithNamespace.js";

/**
 * Returns true when `value` is empty/null (use sim default), or a parseable
 * civil date that falls inside the span the simulation can actually represent
 * ({@link CIVIL_TIME_MS_RANGE}, i.e. the `CIVIL_YEAR_RANGE` the date-jump
 * spinners cover). Parseability alone is not enough: an out-of-range epoch would
 * be silently clamped to the range boundary further down, so a shared link would
 * quietly render a different sky than the one it names. Rejecting it here makes
 * QueryStringMachine warn and fall back to the documented default instead.
 *
 * Used by QueryStringMachine `isValidValue` for the `date` parameter.
 * `StringType` from QueryStringMachine includes `null`, so accept that here.
 */
export function isValidCivilDateQueryParam(value: string | null): boolean {
  if (value === null || value === "") {
    return true;
  }
  if (!hasExplicitUtcOffset(value)) {
    return false;
  }
  const ms = Date.parse(value);
  return !Number.isNaN(ms) && CIVIL_TIME_MS_RANGE.contains(ms);
}

/**
 * Parses a civil-date query string to UTC ms, or null when empty, unparseable,
 * or outside {@link CIVIL_TIME_MS_RANGE}.
 */
export function parseCivilDateQueryParam(value: string | null): number | null {
  if (value === null || value === "" || !hasExplicitUtcOffset(value)) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) || !CIVIL_TIME_MS_RANGE.contains(ms) ? null : ms;
}

/**
 * ISO-8601 date-only (which `Date.parse` reads as UTC midnight) or a timestamp
 * with an explicit UTC designator or numeric offset. A bare date-time is
 * rejected because `Date.parse` reads it as the viewer's local time.
 */
const hasExplicitUtcOffset = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2}))?$/i.test(value);

/**
 * Resolves the civil-time seed for ZenithModel from the `date` query parameter.
 * Empty / missing → DEFAULT_CIVIL_TIME_MS.
 */
export function resolveCivilTimeMsFromQuery(value: string | null): number {
  return parseCivilDateQueryParam(value) ?? DEFAULT_CIVIL_TIME_MS;
}

const zenithQueryParameters = QueryStringMachine.getAll({
  /**
   * Observer latitude in degrees (+N / −S). Example: `?lat=-33.9`.
   */
  lat: {
    type: "number",
    defaultValue: DEFAULT_LATITUDE_DEG,
    isValidValue: (value: number) => value >= LATITUDE_RANGE.min && value <= LATITUDE_RANGE.max,
    public: true,
  },

  /**
   * Observer longitude in degrees (+E / −W). Example: `?lon=151.2`.
   */
  lon: {
    type: "number",
    defaultValue: DEFAULT_LONGITUDE_DEG,
    isValidValue: (value: number) => value >= LONGITUDE_RANGE.min && value <= LONGITUDE_RANGE.max,
    public: true,
  },

  /**
   * Civil UTC timestamp (`Date.parse` / ISO-8601), within the supported civil
   * year range (1900–2100). Empty string — or a date outside that range — uses
   * the sim default. Example: `?date=2024-12-21T10:00:00Z`.
   */
  date: {
    type: "string",
    defaultValue: "",
    isValidValue: isValidCivilDateQueryParam,
    public: true,
  },

  /**
   * Horizontal field of view in degrees. Example: `?fov=90`.
   */
  fov: {
    type: "number",
    defaultValue: DEFAULT_FIELD_OF_VIEW_DEG,
    isValidValue: (value: number) => value >= FIELD_OF_VIEW_RANGE.min && value <= FIELD_OF_VIEW_RANGE.max,
    public: true,
  },

  /**
   * Faintest visible star magnitude. Example: `?magLimit=4`.
   */
  magLimit: {
    type: "number",
    defaultValue: DEFAULT_MAGNITUDE_LIMIT,
    isValidValue: (value: number) => value >= MAGNITUDE_LIMIT_RANGE.min && value <= MAGNITUDE_LIMIT_RANGE.max,
    public: true,
  },

  /**
   * Whether curated bright-star name labels are drawn.
   * Seeds Preferences → Simulation. Example: `?showStarLabels=false`.
   */
  showStarLabels: {
    type: "boolean",
    defaultValue: DEFAULT_SHOW_STAR_LABELS,
    public: true,
  },

  /**
   * Whether classroom constellation stick figures are drawn.
   * Seeds Preferences → Simulation. Example: `?showConstellations=true`.
   */
  showConstellations: {
    type: "boolean",
    defaultValue: DEFAULT_SHOW_CONSTELLATIONS,
    public: true,
  },

  /**
   * Whether preferred planet name labels are drawn.
   * Seeds Preferences → Simulation. Example: `?showPlanetLabels=false`.
   */
  showPlanetLabels: {
    type: "boolean",
    defaultValue: DEFAULT_SHOW_PLANET_LABELS,
    public: true,
  },

  /**
   * Whether the deeper Hipparcos star catalog (mag <= 7.5, ~25,700 stars) is
   * rendered in place of the bundled bright-star catalog. Seeds Preferences →
   * Simulation. Example: `?deepStarCatalog=true`.
   */
  deepStarCatalog: {
    type: "boolean",
    defaultValue: DEFAULT_DEEP_STAR_CATALOG,
    public: true,
  },
});

ZenithNamespace.register("zenithQueryParameters", zenithQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default zenithQueryParameters;
