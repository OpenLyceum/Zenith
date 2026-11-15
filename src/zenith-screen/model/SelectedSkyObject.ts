/**
 * SelectedSkyObject.ts
 *
 * Discriminated union for the currently selected FOV object (named star or
 * solar-system body). Coordinates for planets are looked up from ephemerides
 * at display time; stars store fixed J2000 RA/Dec.
 */

import type { PlanetBodyId } from "../../common/sky/PlanetEphemeris.js";

type SelectedNamedStar = {
  readonly kind: "star";
  readonly id: string;
  readonly raHours: number;
  readonly decDeg: number;
  readonly mag: number;
};

type SelectedPlanet = {
  readonly kind: "planet";
  readonly id: PlanetBodyId;
};

export type SelectedSkyObject = SelectedNamedStar | SelectedPlanet;
