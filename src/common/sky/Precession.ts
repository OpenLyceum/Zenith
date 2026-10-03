/** IAU 1976 (Lieske) precession from J2000 to the mean equator/equinox of date. */
import { degToRad, type EquatorialCoordinates, normalizeHours, radiansToHours, radToDeg } from "./SkyCoordinates.js";

const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12);
const DAYS_PER_JULIAN_CENTURY = 36525;
const MS_PER_DAY = 86400000;
const ARCSECONDS_PER_DEGREE = 3600;

/** Row-major rotation; shared by every star at one civil epoch. */
export type PrecessionMatrix = readonly [number, number, number, number, number, number, number, number, number];

let cachedEpochMs = Number.NaN;
let cachedMatrix: PrecessionMatrix;

export const precessionMatrixAt = (civilTimeMs: number): PrecessionMatrix => {
  if (civilTimeMs === cachedEpochMs) {
    return cachedMatrix;
  }
  const t = (civilTimeMs - J2000_UNIX_MS) / (MS_PER_DAY * DAYS_PER_JULIAN_CENTURY);
  const zeta = degToRad((2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) / ARCSECONDS_PER_DEGREE);
  const z = degToRad((2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) / ARCSECONDS_PER_DEGREE);
  const theta = degToRad((2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) / ARCSECONDS_PER_DEGREE);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  const cze = Math.cos(zeta);
  const sze = Math.sin(zeta);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  cachedEpochMs = civilTimeMs;
  cachedMatrix = [
    cz * ct * cze - sz * sze,
    -cz * ct * sze - sz * cze,
    -cz * st,
    sz * ct * cze + cz * sze,
    -sz * ct * sze + cz * cze,
    -sz * st,
    st * cze,
    -st * sze,
    ct,
  ];
  return cachedMatrix;
};

/** Apply a precomputed matrix, with transpose for the reverse of-date → J2000 transform. */
export const rotateEquatorial = (
  raHours: number,
  decDeg: number,
  matrix: PrecessionMatrix,
  reverse = false,
): EquatorialCoordinates => {
  const ra = (raHours * Math.PI) / 12;
  const dec = degToRad(decDeg);
  const cosDec = Math.cos(dec);
  const x = cosDec * Math.cos(ra);
  const y = cosDec * Math.sin(ra);
  const zz = Math.sin(dec);
  const xx = reverse ? matrix[0] * x + matrix[3] * y + matrix[6] * zz : matrix[0] * x + matrix[1] * y + matrix[2] * zz;
  const yy = reverse ? matrix[1] * x + matrix[4] * y + matrix[7] * zz : matrix[3] * x + matrix[4] * y + matrix[5] * zz;
  const zOut = reverse
    ? matrix[2] * x + matrix[5] * y + matrix[8] * zz
    : matrix[6] * x + matrix[7] * y + matrix[8] * zz;
  return {
    raHours: normalizeHours(radiansToHours(Math.atan2(yy, xx))),
    decDeg: radToDeg(Math.atan2(zOut, Math.hypot(xx, yy))),
  };
};
