/**
 * EclipticCoordinates.ts
 *
 * Pure spherical-astronomy helpers for the ecliptic — the Sun's apparent yearly
 * path and the plane of the solar system. No scenery / model dependencies, so the
 * module is trivially unit-testable (see tests/EclipticCoordinates.test.ts).
 *
 * ── Conventions ───────────────────────────────────────────────────────────────
 *  - Ecliptic longitude / latitude in degrees; longitude measured eastward from
 *    the vernal equinox (0°), latitude +N / −S of the ecliptic plane.
 *  - Output equatorial coordinates match {@link SkyCoordinates}: right ascension
 *    (RA) in hours [0, 24), declination (Dec) in degrees.
 *  - Obliquity ε is the tilt of the ecliptic to the equator.
 */

import { degToRad, type EquatorialCoordinates, normalizeHours, radiansToHours } from "./SkyCoordinates.js";

/**
 * Mean obliquity of the ecliptic at epoch J2000.0, in degrees.
 * @internal Exported for unit tests; not part of the application API.
 */
export const OBLIQUITY_J2000_DEG = 23.4392911;

/**
 * Ecliptic (λ, β) → equatorial (RA, Dec). Standard rotation about the vernal-equinox
 * axis by the obliquity ε. RA is returned in hours [0, 24), Dec in degrees.
 * @internal Exported for unit tests; not part of the application API.
 */
export const eclipticToEquatorial = (
  eclipticLonDeg: number,
  eclipticLatDeg: number,
  obliquityDeg: number = OBLIQUITY_J2000_DEG,
): EquatorialCoordinates => {
  const lon = degToRad(eclipticLonDeg);
  const lat = degToRad(eclipticLatDeg);
  const eps = degToRad(obliquityDeg);

  const sinDec = Math.sin(lat) * Math.cos(eps) + Math.cos(lat) * Math.sin(eps) * Math.sin(lon);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const ra = Math.atan2(Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps), Math.cos(lon));

  return {
    raHours: normalizeHours(radiansToHours(ra)),
    decDeg: (dec * 180) / Math.PI,
  };
};

/**
 * Samples the ecliptic great circle (β = 0) from longitude 0° to 360° inclusive in
 * `stepDeg` increments, mapping each point through {@link eclipticToEquatorial}. The
 * closed loop is what the view projects as the ecliptic polyline.
 */
export const eclipticEquatorPoints = (
  stepDeg: number,
  obliquityDeg: number = OBLIQUITY_J2000_DEG,
): EquatorialCoordinates[] => {
  const points: EquatorialCoordinates[] = [];
  for (let lon = 0; lon <= 360; lon += stepDeg) {
    points.push(eclipticToEquatorial(lon, 0, obliquityDeg));
  }
  return points;
};
