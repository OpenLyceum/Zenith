/**
 * SkyCoordinates.ts
 *
 * Pure spherical-astronomy helpers shared by every screen. No scenery / model
 * dependencies — only `Vector3` from dot — so the whole module is trivially
 * unit-testable (see tests/SkyCoordinates.test.ts).
 *
 * ── Conventions ───────────────────────────────────────────────────────────────
 *  - Right ascension (RA) is in hours [0, 24); declination (Dec) in degrees.
 *  - Latitude in degrees, +N / −S. Local sidereal time (LST) in hours.
 *  - Altitude in degrees above the horizon; azimuth in degrees measured from
 *    North (0°) increasing through East (90°), South (180°), West (270°).
 *  - Hour angle H = LST − RA (hours), positive when the object is west of the
 *    meridian.
 *
 * ── 3-D frames (unit sphere) ──────────────────────────────────────────────────
 *  Equatorial frame (used as the world frame for the celestial sphere):
 *    +Z → North Celestial Pole, equator in the XY-plane, +X at RA 0h.
 *  Horizon frame (used as the world frame for the horizon dome):
 *    +Z → zenith, +X → North, +Y → East.
 */

import { Vector3 } from "scenerystack/dot";
import type { PrecessionMatrix } from "./Precession.js";

export type EquatorialCoordinates = { raHours: number; decDeg: number };
export type HorizontalCoordinates = { altDeg: number; azDeg: number };

/** Where a star of a given declination spends its day at a given latitude. */
export type DeclinationBand = "circumpolar" | "risesAndSets" | "neverRises";

export const HOURS_PER_DAY = 24;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const HOURS_TO_RAD = (2 * Math.PI) / HOURS_PER_DAY;

export const degToRad = (deg: number): number => deg * DEG_TO_RAD;
export const radToDeg = (rad: number): number => rad * RAD_TO_DEG;
export const hoursToRadians = (hours: number): number => hours * HOURS_TO_RAD;
export const radiansToHours = (rad: number): number => rad / HOURS_TO_RAD;

/** Wraps an hour value into [0, 24). */
export const normalizeHours = (hours: number): number => ((hours % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;

/** Wraps a degree value into [0, 360). */
export const normalizeDegrees = (deg: number): number => ((deg % 360) + 360) % 360;

/** Hour angle H = LST − RA, wrapped into [−12, 12) hours. */
export const hourAngle = (raHours: number, lstHours: number): number => {
  const h = normalizeHours(lstHours - raHours);
  return h >= HOURS_PER_DAY / 2 ? h - HOURS_PER_DAY : h;
};

/** Equatorial (RA, Dec) → unit vector in the equatorial frame (+Z = NCP). */
export const raDecToVector3 = (raHours: number, decDeg: number): Vector3 => {
  const ra = hoursToRadians(raHours);
  const dec = degToRad(decDeg);
  const cosDec = Math.cos(dec);
  return new Vector3(cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec));
};

/** Horizontal (Alt, Az) → unit vector in the horizon frame (+X = N, +Y = E, +Z = up). */
export const altAzToVector3 = (altDeg: number, azDeg: number): Vector3 => {
  const alt = degToRad(altDeg);
  const az = degToRad(azDeg);
  const cosAlt = Math.cos(alt);
  return new Vector3(cosAlt * Math.cos(az), cosAlt * Math.sin(az), Math.sin(alt));
};

/**
 * Equatorial → horizontal for an observer at `latitudeDeg` and local sidereal
 * time `lstHours`. Standard astronomy transform, evaluated through the
 * horizon-frame vector (north, east, up) so azimuth is a division-free
 * atan2(east, north). The classical form divides by cos(lat)·cos(alt), whose
 * numerator cancels catastrophically near the poles and collapses every
 * azimuth to ±90°.
 */
export const equatorialToHorizontal = (
  raHours: number,
  decDeg: number,
  latitudeDeg: number,
  lstHours: number,
  precession?: PrecessionMatrix,
): HorizontalCoordinates => {
  if (precession) {
    const vector = equatorialToHorizonVector(raHours, decDeg, latitudeDeg, lstHours, precession);
    return {
      altDeg: radToDeg(Math.atan2(vector.z, Math.hypot(vector.x, vector.y))),
      azDeg: normalizeDegrees(radToDeg(Math.atan2(vector.y, vector.x))),
    };
  }
  const dec = degToRad(decDeg);
  const lat = degToRad(latitudeDeg);
  const ha = hoursToRadians(hourAngle(raHours, lstHours));

  const north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
  const east = -Math.cos(dec) * Math.sin(ha);
  const up = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);

  const alt = Math.atan2(up, Math.hypot(north, east));
  const az = normalizeDegrees(radToDeg(Math.atan2(east, north)));

  return { altDeg: radToDeg(alt), azDeg: az };
};

/**
 * Equatorial → horizon as a unit vector (+X north, +Y east, +Z zenith). Uses the
 * same astronomy as {@link equatorialToHorizontal} but skips alt/az, so paths
 * through the zenith or nadir stay smooth at the poles.
 */
export const equatorialToHorizonVector = (
  raHours: number,
  decDeg: number,
  latitudeDeg: number,
  lstHours: number,
  precession?: PrecessionMatrix,
): Vector3 => {
  if (precession) {
    const ra = hoursToRadians(raHours);
    const dec = degToRad(decDeg);
    const cosDec = Math.cos(dec);
    const x = cosDec * Math.cos(ra);
    const y = cosDec * Math.sin(ra);
    const z = Math.sin(dec);
    const px = precession[0] * x + precession[1] * y + precession[2] * z;
    const py = precession[3] * x + precession[4] * y + precession[5] * z;
    const pz = precession[6] * x + precession[7] * y + precession[8] * z;
    const lat = degToRad(latitudeDeg);
    const sidereal = hoursToRadians(lstHours);
    const meridian = px * Math.cos(sidereal) + py * Math.sin(sidereal);
    return new Vector3(
      pz * Math.cos(lat) - meridian * Math.sin(lat),
      -px * Math.sin(sidereal) + py * Math.cos(sidereal),
      pz * Math.sin(lat) + meridian * Math.cos(lat),
    );
  }
  const dec = degToRad(decDeg);
  const lat = degToRad(latitudeDeg);
  const ha = hoursToRadians(hourAngle(raHours, lstHours));

  const north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
  const east = -Math.cos(dec) * Math.sin(ha);
  const up = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);

  return new Vector3(north, east, up).normalized();
};

/**
 * Horizontal → equatorial — the inverse of {@link equatorialToHorizontal}. Used
 * when the user shift-clicks a point on the horizon dome to create a star there.
 */
export const horizontalToEquatorial = (
  altDeg: number,
  azDeg: number,
  latitudeDeg: number,
  lstHours: number,
): EquatorialCoordinates => {
  const alt = degToRad(altDeg);
  const az = degToRad(azDeg);
  const lat = degToRad(latitudeDeg);

  // Same division-free vector form as equatorialToHorizontal (the transform is
  // its own inverse with az ↔ −ha), so it also stays finite at the poles.
  const toPole = Math.sin(alt) * Math.sin(lat) + Math.cos(alt) * Math.cos(az) * Math.cos(lat);
  const toEquinox = Math.sin(alt) * Math.cos(lat) - Math.cos(alt) * Math.cos(az) * Math.sin(lat);
  const westward = Math.cos(alt) * Math.sin(az);

  const dec = Math.atan2(toPole, Math.hypot(toEquinox, westward));
  const haHours = radiansToHours(Math.atan2(-westward, toEquinox));

  return { raHours: normalizeHours(lstHours - haHours), decDeg: radToDeg(dec) };
};

/** Altitude (degrees) of a star at the given hour angle — used for culmination. */
export const altitudeAtHourAngle = (decDeg: number, latitudeDeg: number, hourAngleHours: number): number => {
  const dec = degToRad(decDeg);
  const lat = degToRad(latitudeDeg);
  const ha = hoursToRadians(hourAngleHours);
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  return radToDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
};

/**
 * Classifies a declination at a latitude as circumpolar (never sets), never
 * rising, or rising-and-setting, by comparing the altitudes at upper (H = 0) and
 * lower (H = 12h) culmination against the horizon.
 */
export const declinationBand = (decDeg: number, latitudeDeg: number): DeclinationBand => {
  const maxAlt = altitudeAtHourAngle(decDeg, latitudeDeg, 0);
  const minAlt = altitudeAtHourAngle(decDeg, latitudeDeg, HOURS_PER_DAY / 2);
  if (minAlt >= 0) {
    return "circumpolar";
  }
  if (maxAlt <= 0) {
    return "neverRises";
  }
  return "risesAndSets";
};

/** Rise / set / transit geometry for one object at one latitude (no refraction). */
export type RiseSetInfo = {
  band: DeclinationBand;
  /** Local sidereal time (hours) of upper transit = the object's RA. */
  transitLstHours: number;
  /** Altitude (degrees) at upper transit. */
  transitAltitudeDeg: number;
  /** LST and azimuth of rise / set; null unless the object rises and sets. */
  riseLstHours: number | null;
  setLstHours: number | null;
  riseAzimuthDeg: number | null;
  setAzimuthDeg: number | null;
};

/**
 * Geometric rise / set / transit for an object at (raHours, decDeg) seen from
 * `latitudeDeg`. Rise and set are the LSTs at which the object crosses the true
 * (unrefracted) horizon; transit is upper culmination (H = 0, LST = RA).
 */
export const riseSetInfo = (raHours: number, decDeg: number, latitudeDeg: number): RiseSetInfo => {
  const band = declinationBand(decDeg, latitudeDeg);
  const transitAltitudeDeg = altitudeAtHourAngle(decDeg, latitudeDeg, 0);
  const base: RiseSetInfo = {
    band,
    transitLstHours: normalizeHours(raHours),
    transitAltitudeDeg,
    riseLstHours: null,
    setLstHours: null,
    riseAzimuthDeg: null,
    setAzimuthDeg: null,
  };
  if (band !== "risesAndSets") {
    return base;
  }
  // Hour angle where alt = 0: cos H0 = −tan(lat)·tan(dec).
  const cosH0 = -Math.tan(degToRad(latitudeDeg)) * Math.tan(degToRad(decDeg));
  const h0Hours = radiansToHours(Math.acos(Math.max(-1, Math.min(1, cosH0))));
  const riseLstHours = normalizeHours(raHours - h0Hours);
  const setLstHours = normalizeHours(raHours + h0Hours);
  return {
    ...base,
    riseLstHours,
    setLstHours,
    riseAzimuthDeg: equatorialToHorizontal(raHours, decDeg, latitudeDeg, riseLstHours).azDeg,
    setAzimuthDeg: equatorialToHorizontal(raHours, decDeg, latitudeDeg, setLstHours).azDeg,
  };
};

/**
 * Solar (civil) hours from now until local sidereal time next reaches
 * `targetLstHours`, given the current LST and how fast LST runs vs the civil
 * clock. Always in [0, 24/rate) — the next occurrence.
 */
export const solarHoursUntilLst = (
  currentLstHours: number,
  targetLstHours: number,
  siderealHoursPerSolarHour: number,
): number => normalizeHours(targetLstHours - currentLstHours) / siderealHoursPerSolarHour;

/** Angular separation (degrees) between two equatorial directions. */
export const angularSeparationDeg = (raHoursA: number, decDegA: number, raHoursB: number, decDegB: number): number => {
  const a = raDecToVector3(raHoursA, decDegA);
  const b = raDecToVector3(raHoursB, decDegB);
  return radToDeg(Math.acos(Math.max(-1, Math.min(1, a.dot(b)))));
};
