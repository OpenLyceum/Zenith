/**
 * SkyTwilight.ts
 *
 * Maps solar altitude to sky / ground colors and star visibility. Pure math —
 * no Scenery / model deps — so it can be unit-tested and reused by the view.
 *
 * Bands follow the usual twilight definitions:
 *   day                sun ≥ 0°
 *   civil twilight     −6° … 0°
 *   nautical twilight  −12° … −6°
 *   astronomical       −18° … −12°
 *   night              sun < −18°
 */

import { clamp } from "scenerystack/dot";
import { Color } from "scenerystack/scenery";

/** Solar altitude (°) at the start of civil twilight (Sun at horizon = 0). */
export const CIVIL_TWILIGHT_DEG = -6;

/** Solar altitude (°) at the start of astronomical twilight / end of night. */
export const ASTRONOMICAL_TWILIGHT_DEG = -18;

export type TwilightPalette = {
  readonly nightZenith: Color;
  readonly nightHorizon: Color;
  readonly nightGround: Color;
  readonly dayZenith: Color;
  readonly dayHorizon: Color;
  readonly dayGround: Color;
  readonly twilightHorizon: Color;
};

export type TwilightSkyColors = {
  readonly zenith: Color;
  readonly horizon: Color;
  readonly ground: Color;
};

/**
 * Smoothstep from `lo` → `hi` mapped onto [0, 1]. Outside the range the result
 * is clamped.
 */
const smoothstep = (value: number, lo: number, hi: number): number => {
  const t = clamp((value - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Star / constellation opacity: fully visible below astronomical twilight,
 * fully gone once the Sun is above the horizon. Civil/nautical bands fade.
 */
export const starVisibilityFromSolarAltitude = (solarAltitudeDeg: number): number => {
  if (solarAltitudeDeg <= ASTRONOMICAL_TWILIGHT_DEG) {
    return 1;
  }
  if (solarAltitudeDeg >= 0) {
    return 0;
  }
  return 1 - smoothstep(solarAltitudeDeg, ASTRONOMICAL_TWILIGHT_DEG, 0);
};

/**
 * Effective star opacity for the FOV. With atmosphere off (Stellarium-style),
 * stars stay fully visible regardless of solar altitude.
 */
export const effectiveStarVisibility = (solarAltitudeDeg: number, atmosphereVisible: boolean): number =>
  atmosphereVisible ? starVisibilityFromSolarAltitude(solarAltitudeDeg) : 1;

/**
 * Interpolate zenith / horizon / ground colors from solar altitude.
 * Horizon warms through twilight before the day blue takes over.
 */
export const twilightSkyColors = (solarAltitudeDeg: number, palette: TwilightPalette): TwilightSkyColors => {
  const dayAmount = smoothstep(solarAltitudeDeg, ASTRONOMICAL_TWILIGHT_DEG, CIVIL_TWILIGHT_DEG + 6);
  // Peak warm horizon near civil twilight, fading toward night and day.
  const warmPeak = Math.exp(-0.5 * ((solarAltitudeDeg - CIVIL_TWILIGHT_DEG) / 4) ** 2);

  const zenith = Color.interpolateRGBA(palette.nightZenith, palette.dayZenith, dayAmount);
  const baseHorizon = Color.interpolateRGBA(palette.nightHorizon, palette.dayHorizon, dayAmount);
  const horizon = Color.interpolateRGBA(baseHorizon, palette.twilightHorizon, warmPeak * (1 - dayAmount * 0.35));
  const ground = Color.interpolateRGBA(palette.nightGround, palette.dayGround, dayAmount);

  return { zenith, horizon, ground };
};
