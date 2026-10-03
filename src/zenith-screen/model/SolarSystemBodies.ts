/**
 * SolarSystemBodies.ts
 *
 * Visual metadata for planetarium discs, adapted from Stellarium Web Engine
 * `data/planets.ini` (approximate radius). Ephemeris lives in
 * PlanetEphemeris.ts — this file is display-only.
 */

import type { PlanetBodyId } from "../../common/sky/PlanetEphemeris.js";

export type SolarSystemBodyVisual = {
  readonly id: PlanetBodyId;
  /** Physical radius in km (for relative disc sizing). */
  readonly radiusKm: number;
  /** Prefer drawing a name label when this is true. */
  readonly preferLabel: boolean;
  /** Minimum screen radius (px) so faint outer planets stay visible. */
  readonly minDiscRadiusPx: number;
  /** Maximum screen radius (px). */
  readonly maxDiscRadiusPx: number;
};

/**
 * Body visuals in paint order (Sun/Moon first for z-order preference when
 * overlapping — the view still draws in this array order).
 */
export const SOLAR_SYSTEM_BODIES: readonly SolarSystemBodyVisual[] = [
  {
    id: "sun",
    radiusKm: 696000,
    preferLabel: true,
    minDiscRadiusPx: 10,
    maxDiscRadiusPx: 22,
  },
  {
    id: "moon",
    radiusKm: 1738,
    preferLabel: true,
    minDiscRadiusPx: 8,
    maxDiscRadiusPx: 18,
  },
  {
    id: "mercury",
    radiusKm: 2440,
    preferLabel: true,
    minDiscRadiusPx: 0.75,
    maxDiscRadiusPx: 1.75,
  },
  {
    id: "venus",
    radiusKm: 6052,
    preferLabel: true,
    minDiscRadiusPx: 1,
    maxDiscRadiusPx: 2.25,
  },
  {
    id: "mars",
    radiusKm: 3394,
    preferLabel: true,
    minDiscRadiusPx: 0.875,
    maxDiscRadiusPx: 2,
  },
  {
    id: "jupiter",
    radiusKm: 69911,
    preferLabel: true,
    minDiscRadiusPx: 1.25,
    maxDiscRadiusPx: 3,
  },
  {
    id: "saturn",
    radiusKm: 58232,
    preferLabel: true,
    minDiscRadiusPx: 1.125,
    maxDiscRadiusPx: 2.75,
  },
  {
    id: "uranus",
    radiusKm: 25362,
    preferLabel: true,
    minDiscRadiusPx: 0.75,
    maxDiscRadiusPx: 1.75,
  },
  {
    id: "neptune",
    radiusKm: 24624,
    preferLabel: true,
    minDiscRadiusPx: 0.75,
    maxDiscRadiusPx: 1.75,
  },
] as const;

export const solarSystemBodyVisual = (id: PlanetBodyId): SolarSystemBodyVisual => {
  const found = SOLAR_SYSTEM_BODIES.find((b) => b.id === id);
  if (!found) {
    throw new Error(`Unknown solar-system body: ${id}`);
  }
  return found;
};
