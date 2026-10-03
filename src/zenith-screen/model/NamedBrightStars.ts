/**
 * NamedBrightStars.ts
 *
 * Curated classroom bright stars with J2000 equatorial coordinates. Used for
 * name labels and object selection — independent of the anonymous catalog arrays.
 */

export type NamedBrightStar = {
  /** Stable id used for strings and selection. */
  readonly id: string;
  readonly raHours: number;
  readonly decDeg: number;
  readonly mag: number;
};

/**
 * Classroom staples plus constellation anchor stars.
 * Coordinates are J2000 (hours / degrees), matching BrightStarCatalog. Both are
 * precessed to the mean equator of date for horizontal projection.
 */
export const NAMED_BRIGHT_STARS: readonly NamedBrightStar[] = [
  { id: "polaris", raHours: 2.5303, decDeg: 89.2641, mag: 1.97 },
  { id: "sirius", raHours: 6.7525, decDeg: -16.7161, mag: -1.46 },
  { id: "canopus", raHours: 6.3992, decDeg: -52.6957, mag: -0.74 },
  { id: "arcturus", raHours: 14.261, decDeg: 19.1824, mag: -0.05 },
  { id: "vega", raHours: 18.6156, decDeg: 38.7837, mag: 0.03 },
  { id: "capella", raHours: 5.2781, decDeg: 45.998, mag: 0.08 },
  { id: "rigel", raHours: 5.2423, decDeg: -8.2016, mag: 0.13 },
  { id: "procyon", raHours: 7.6551, decDeg: 5.225, mag: 0.34 },
  { id: "betelgeuse", raHours: 5.9195, decDeg: 7.4071, mag: 0.42 },
  { id: "altair", raHours: 19.8463, decDeg: 8.8683, mag: 0.77 },
  { id: "aldebaran", raHours: 4.5987, decDeg: 16.5093, mag: 0.86 },
  { id: "antares", raHours: 16.4901, decDeg: -26.4319, mag: 1.09 },
  { id: "spica", raHours: 13.4199, decDeg: -11.1613, mag: 0.97 },
  { id: "pollux", raHours: 7.7553, decDeg: 28.0262, mag: 1.14 },
  { id: "fomalhaut", raHours: 22.9608, decDeg: -29.6222, mag: 1.16 },
  { id: "deneb", raHours: 20.6905, decDeg: 45.2803, mag: 1.25 },
  { id: "regulus", raHours: 10.1396, decDeg: 11.9672, mag: 1.35 },
  { id: "bellatrix", raHours: 5.4186, decDeg: 6.3497, mag: 1.64 },
  { id: "alnilam", raHours: 5.6036, decDeg: -1.2019, mag: 1.69 },
  { id: "alnitak", raHours: 5.6794, decDeg: -1.9426, mag: 1.77 },
  { id: "mintaka", raHours: 5.5334, decDeg: -0.2991, mag: 2.23 },
  { id: "saiph", raHours: 5.7959, decDeg: -9.6696, mag: 2.06 },
  { id: "dubhe", raHours: 11.0621, decDeg: 61.751, mag: 1.79 },
  { id: "merak", raHours: 11.0307, decDeg: 56.3824, mag: 2.37 },
  { id: "phecda", raHours: 11.8972, decDeg: 53.6948, mag: 2.44 },
  { id: "megrez", raHours: 12.2571, decDeg: 57.0326, mag: 3.31 },
  { id: "alioth", raHours: 12.9004, decDeg: 55.9598, mag: 1.77 },
  { id: "mizar", raHours: 13.3987, decDeg: 54.9254, mag: 2.27 },
  { id: "alkaid", raHours: 13.7923, decDeg: 49.3133, mag: 1.86 },
  { id: "schedar", raHours: 0.6751, decDeg: 56.5373, mag: 2.23 },
  { id: "caph", raHours: 0.1529, decDeg: 59.1498, mag: 2.27 },
  { id: "gammaCas", raHours: 0.9451, decDeg: 60.7167, mag: 2.47 },
  { id: "ruchbah", raHours: 1.4302, decDeg: 60.2353, mag: 2.68 },
  { id: "segin", raHours: 1.9066, decDeg: 63.6701, mag: 3.38 },
  { id: "acrux", raHours: 12.4433, decDeg: -63.0991, mag: 0.77 },
  { id: "mimosa", raHours: 12.7954, decDeg: -59.6888, mag: 1.25 },
  { id: "gacrux", raHours: 12.5194, decDeg: -57.1132, mag: 1.59 },
  { id: "deltaCru", raHours: 12.2524, decDeg: -58.7489, mag: 2.8 },
];

export const namedStarById = (id: string): NamedBrightStar | undefined =>
  NAMED_BRIGHT_STARS.find((star) => star.id === id);
