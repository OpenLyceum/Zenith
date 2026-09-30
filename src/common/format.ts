/**
 * format.ts
 *
 * Shared readout formatting helpers used across view nodes. Centralized so a
 * single precision change (e.g. "show 3 decimal places on magnitudes") updates
 * every readout consistently. Pure functions with no Scenery / model deps.
 */

import { toFixed } from "scenerystack/dot";

/** Equatorial RA or LST in hours, two decimals (e.g. "5.24"). */
export const formatHours = (hours: number): string => toFixed(hours, 2);

/** Angle in degrees, one decimal (e.g. "12.3"). */
export const formatDeg = (deg: number): string => toFixed(deg, 1);

/** Apparent visual magnitude, two decimals (e.g. "-1.50"). */
export const formatMag = (mag: number): string => toFixed(mag, 2);

/**
 * Formats a positive duration in hours as "Hh Mm" (or "Mm" under an hour).
 * Negative inputs are clamped to zero — used for rise/set/transit wait times.
 */
export const formatDuration = (hours: number): string => {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
