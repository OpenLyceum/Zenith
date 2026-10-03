/**
 * PlanetEphemeris.ts
 *
 * Thin wrapper around astronomy-engine for geocentric equatorial positions of
 * the Sun, Moon, and major planets. Pure functions — no Scenery / model deps.
 *
 * astronomy-engine gives J2000 directions. We precess them to the mean equator
 * of date, matching the mean sidereal clock used for horizontal projection.
 * Its apparent (nutated) EQD output is intentionally not used with mean LST.
 */

import {
  Body,
  Constellation,
  Elongation,
  Equator,
  Illumination,
  KM_PER_AU,
  MakeTime,
  MoonPhase,
  Observer,
  RAD2DEG,
} from "astronomy-engine";
import { precessionMatrixAt, rotateEquatorial } from "./Precession.js";
import { normalizeHours } from "./SkyCoordinates.js";

/** Solar-system bodies shown in the Zenith planetarium (v1). */
export type PlanetBodyId = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";

export const PLANET_BODY_IDS: readonly PlanetBodyId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
] as const;

const BODY_MAP: Record<PlanetBodyId, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
};

const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12);
const MS_PER_DAY = 86400000;
const DAYS_PER_JULIAN_CENTURY = 36525;
// IAU 1982 / Meeus GMST polynomial, degrees from J2000.0 UT1.
const GMST_J2000_DEG = 280.46061837;
const GMST_DEG_PER_DAY = 360.98564736629;
const GMST_QUADRATIC_DEG = 0.000387933;
const GMST_CUBIC_DIVISOR = 38710000;

export type PlanetEquatorialState = {
  raHours: number;
  decDeg: number;
  /** Visual magnitude (Illumination); Sun uses a fixed bright value. */
  mag: number;
  /** Topocentric distance in AU (from astronomy-engine Equator). */
  distAu: number;
  /** Illuminated fraction of the disc, [0, 1]. 1 for the Sun (always "full"). */
  phaseFraction: number;
  /**
   * Screen side of the lit limb: true renders the illuminated crescent/gibbous
   * on the right (+x). Approximated from solar elongation direction — a body
   * east of the Sun (evening sky) shows its lit limb on the right, matching the
   * waxing-Moon teaching convention. Not a true parallactic bright-limb angle.
   */
  litOnRight: boolean;
};

/**
 * Lunar phase for disc rendering.
 * `phaseFraction` is 0 at new Moon and 1 at full; `waxing` is true from new → full.
 */
export type MoonPhaseState = {
  phaseFraction: number;
  waxing: boolean;
  /** Illumination phase angle in degrees (0 = full, 180 = new). */
  phaseAngleDeg: number;
};

/**
 * Greenwich mean sidereal time (hours) + longitude → local sidereal time.
 * Longitude is degrees east-positive (matches ZenithModel).
 * UT1 is approximated by UTC; its sub-second offset is negligible here.
 */
export const localSiderealTimeHours = (civilTimeMs: number, longitudeDeg: number): number => {
  const daysSinceJ2000 = (civilTimeMs - J2000_UNIX_MS) / MS_PER_DAY;
  const centuries = daysSinceJ2000 / DAYS_PER_JULIAN_CENTURY;
  const gmstDeg =
    GMST_J2000_DEG +
    GMST_DEG_PER_DAY * daysSinceJ2000 +
    GMST_QUADRATIC_DEG * centuries * centuries -
    (centuries * centuries * centuries) / GMST_CUBIC_DIVISOR;
  return normalizeHours(gmstDeg / 15 + longitudeDeg / 15);
};

/** Topocentric direction in the mean equator of date, without display metadata. */
export const bodyEquatorialOfDate = (
  bodyId: PlanetBodyId,
  civilTimeMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): { raHours: number; decDeg: number; distAu: number } => {
  const eq = Equator(
    BODY_MAP[bodyId],
    MakeTime(new Date(civilTimeMs)),
    new Observer(latitudeDeg, longitudeDeg, 0),
    false,
    true,
  );
  return { ...rotateEquatorial(eq.ra, eq.dec, precessionMatrixAt(civilTimeMs)), distAu: eq.dist };
};

/**
 * Mean equatorial position of date of a body for an Earth observer.
 */
export const planetEquatorialState = (
  bodyId: PlanetBodyId,
  civilTimeMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): PlanetEquatorialState => {
  const time = MakeTime(new Date(civilTimeMs));
  const observer = new Observer(latitudeDeg, longitudeDeg, 0);
  const body = BODY_MAP[bodyId];

  // ofdate=false → J2000 (EQJ); precess once to the mean equator of date.
  const eq = Equator(body, time, observer, false, true);
  const ofDate = rotateEquatorial(eq.ra, eq.dec, precessionMatrixAt(civilTimeMs));

  let mag: number;
  let phaseFraction: number;
  if (bodyId === "sun") {
    mag = -26.74;
    phaseFraction = 1;
  } else {
    const illum = Illumination(body, time);
    mag = illum.mag;
    phaseFraction = illum.phase_fraction;
  }

  // Lit limb faces the Sun; approximate its screen side from elongation.
  const litOnRight = bodyId === "sun" ? true : Elongation(body, time).visibility === "evening";

  return {
    raHours: ofDate.raHours,
    decDeg: ofDate.decDeg,
    mag,
    distAu: eq.dist,
    phaseFraction,
    litOnRight,
  };
};

/**
 * Apparent angular diameter in degrees for a sphere of radius `radiusKm` at
 * topocentric distance `distAu`.
 *
 * θ = 2 atan(R / d)
 */
export const apparentAngularDiameterDeg = (radiusKm: number, distAu: number): number => {
  if (!(distAu > 0 && radiusKm > 0)) {
    return 0;
  }
  return 2 * Math.atan(radiusKm / (distAu * KM_PER_AU)) * RAD2DEG;
};

/**
 * Convert an angular diameter (degrees) to a screen disc radius (pixels) given
 * degrees-per-pixel of the FOV projection.
 */
export const angularDiameterToRadiusPx = (
  angularDiameterDeg: number,
  degreesPerPixel: number,
  minRadiusPx: number,
): number => {
  if (!(degreesPerPixel > 0 && angularDiameterDeg > 0)) {
    return minRadiusPx;
  }
  return Math.max(minRadiusPx, angularDiameterDeg / (2 * degreesPerPixel));
};

/**
 * Illuminated fraction and waxing/waning sense for Moon disc shading.
 * Uses astronomy-engine Illumination + MoonPhase (ecliptic elongation).
 */
export const moonPhaseState = (civilTimeMs: number): MoonPhaseState => {
  const time = MakeTime(new Date(civilTimeMs));
  const illumination = Illumination(Body.Moon, time);
  const elongationDeg = MoonPhase(time);
  return {
    phaseFraction: illumination.phase_fraction,
    phaseAngleDeg: illumination.phase_angle,
    // MoonPhase: 0 = new, 90 = first quarter, 180 = full, 270 = third quarter.
    waxing: elongationDeg < 180,
  };
};

/**
 * astronomy-engine returns three constellation names that differ from the IAU
 * spelling used as keys in the `constellations` string group. Map them back.
 */
const CONSTELLATION_KEY_OVERRIDES: Record<string, string> = {
  Antila: "antlia",
  Camelopardis: "camelopardalis",
  "Pisces Austrinus": "piscisAustrinus",
};

/**
 * IAU constellation containing a J2000 equatorial point, returned as the
 * camelCase key into the `constellations` string group (e.g. "ursaMajor") plus
 * astronomy-engine's English name as a fallback for any unmapped key.
 */
export const constellationAt = (raHours: number, decDeg: number): { key: string; name: string } => {
  const name = Constellation(raHours, decDeg).name;
  const key =
    CONSTELLATION_KEY_OVERRIDES[name] ??
    name
      .split(" ")
      .map((word, index) =>
        index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("");
  return { key, name };
};

/** Solar elongation of a body: angular distance from the Sun plus its side. */
export type ElongationState = {
  /** Angular separation from the Sun in degrees, [0, 180]. */
  elongationDeg: number;
  /** "east" when the body trails the Sun (evening sky); "west" leads it (morning sky). */
  direction: "east" | "west";
};

/**
 * Solar elongation of a body as seen from Earth. Null for the Sun (its
 * elongation from itself is undefined). astronomy-engine reports "evening"
 * visibility for a body east of the Sun and "morning" for one to the west.
 */
export const bodyElongation = (bodyId: PlanetBodyId, civilTimeMs: number): ElongationState | null => {
  if (bodyId === "sun") {
    return null;
  }
  const event = Elongation(BODY_MAP[bodyId], MakeTime(new Date(civilTimeMs)));
  return {
    elongationDeg: event.elongation,
    direction: event.visibility === "evening" ? "east" : "west",
  };
};

/** All v1 bodies at once (convenient for the view redraw). */
export const allPlanetEquatorialStates = (
  civilTimeMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): ReadonlyArray<{ bodyId: PlanetBodyId; state: PlanetEquatorialState }> =>
  PLANET_BODY_IDS.map((bodyId) => ({
    bodyId,
    state: planetEquatorialState(bodyId, civilTimeMs, latitudeDeg, longitudeDeg),
  }));
