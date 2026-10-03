/** Next geometric rise, set, and upper transit of a moving solar-system body. */
import {
  BODY_EVENT_MAX_ITERATIONS,
  BODY_EVENT_TOLERANCE_MS,
  SIDEREAL_HOURS_PER_SOLAR_HOUR,
} from "../../ZenithConstants.js";
import { bodyEquatorialOfDate, localSiderealTimeHours, type PlanetBodyId } from "./PlanetEphemeris.js";
import {
  type DeclinationBand,
  equatorialToHorizontal,
  normalizeHours,
  type RiseSetInfo,
  riseSetInfo,
  solarHoursUntilLst,
} from "./SkyCoordinates.js";

const MS_PER_HOUR = 3600000;
const CACHE_BUCKET_MS = 60000;
const HOURS_PER_DAY = 24;

export type BodyEvent = { timeMs: number; azimuthDeg: number; altitudeDeg: number };
export type BodyEvents = {
  band: DeclinationBand;
  rise: BodyEvent | null;
  set: BodyEvent | null;
  transit: BodyEvent | null;
};

type EventKind = "rise" | "set" | "transit";

const eventCache = new Map<string, BodyEvents>();

const targetLst = (kind: EventKind, info: RiseSetInfo): number | null => {
  if (kind === "rise") {
    return info.riseLstHours;
  }
  return kind === "set" ? info.setLstHours : info.transitLstHours;
};

const refineEventTime = (
  bodyId: PlanetBodyId,
  kind: EventKind,
  initialMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): number | null => {
  let estimate = initialMs;
  for (let pass = 0; pass < BODY_EVENT_MAX_ITERATIONS; pass++) {
    const eq = bodyEquatorialOfDate(bodyId, estimate, latitudeDeg, longitudeDeg);
    const target = targetLst(kind, riseSetInfo(eq.raHours, eq.decDeg, latitudeDeg));
    if (target === null) {
      return null;
    }
    const lst = localSiderealTimeHours(estimate, longitudeDeg);
    const wrapped = normalizeHours(target - lst + HOURS_PER_DAY / 2) - HOURS_PER_DAY / 2;
    const correctionMs = (wrapped / SIDEREAL_HOURS_PER_SOLAR_HOUR) * MS_PER_HOUR;
    estimate += correctionMs;
    if (Math.abs(correctionMs) < BODY_EVENT_TOLERANCE_MS) {
      break;
    }
  }
  return estimate;
};

/**
 * Recompute ephemeris at each estimated event time and correct the local hour
 * angle. The signed correction keeps the iteration on the same event, including
 * when a target LST wraps through 0h. The existing geometric 0° horizon is used.
 */
const computeBodyEvents = (
  bodyId: PlanetBodyId,
  civilTimeMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): BodyEvents => {
  const now = bodyEquatorialOfDate(bodyId, civilTimeMs, latitudeDeg, longitudeDeg);
  const initial = riseSetInfo(now.raHours, now.decDeg, latitudeDeg);
  const currentLst = localSiderealTimeHours(civilTimeMs, longitudeDeg);

  const solve = (kind: EventKind, initialLst: number | null): BodyEvent | null => {
    if (initialLst === null) {
      return null;
    }
    const first = civilTimeMs + solarHoursUntilLst(currentLst, initialLst, SIDEREAL_HOURS_PER_SOLAR_HOUR) * MS_PER_HOUR;
    let estimate = refineEventTime(bodyId, kind, first, latitudeDeg, longitudeDeg);
    if (estimate === null) {
      return null;
    }
    // A rapid lunar shift can pull a near-now first estimate into the past.
    // Advance to the next diurnal occurrence and refine it in that case.
    if (estimate < civilTimeMs) {
      estimate = refineEventTime(
        bodyId,
        kind,
        estimate + (HOURS_PER_DAY / SIDEREAL_HOURS_PER_SOLAR_HOUR) * MS_PER_HOUR,
        latitudeDeg,
        longitudeDeg,
      );
      if (estimate === null) {
        return null;
      }
    }
    const eq = bodyEquatorialOfDate(bodyId, estimate, latitudeDeg, longitudeDeg);
    const horizontal = equatorialToHorizontal(
      eq.raHours,
      eq.decDeg,
      latitudeDeg,
      localSiderealTimeHours(estimate, longitudeDeg),
    );
    return { timeMs: estimate, azimuthDeg: horizontal.azDeg, altitudeDeg: horizontal.altDeg };
  };

  const result: BodyEvents = {
    band: initial.band,
    rise: initial.band === "risesAndSets" ? solve("rise", initial.riseLstHours) : null,
    set: initial.band === "risesAndSets" ? solve("set", initial.setLstHours) : null,
    transit: initial.band === "neverRises" ? null : solve("transit", initial.transitLstHours),
  };
  return result;
};

/**
 * Quantize only the prediction's reference epoch, not the model clock. This
 * makes the cache deterministic for identical inputs and cuts moving-body
 * ephemeris work from every frame to once per minute. Switch to the following
 * minute's prediction as soon as any event has passed.
 */
export const nextBodyEvents = (
  bodyId: PlanetBodyId,
  civilTimeMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): BodyEvents => {
  const at = (referenceMs: number): BodyEvents => {
    const key = `${bodyId}:${latitudeDeg}:${longitudeDeg}:${referenceMs}`;
    const existing = eventCache.get(key);
    if (existing) {
      return existing;
    }
    const events = computeBodyEvents(bodyId, referenceMs, latitudeDeg, longitudeDeg);
    if (eventCache.size >= 2) {
      eventCache.clear();
    }
    eventCache.set(key, events);
    return events;
  };
  const bucketStart = Math.floor(civilTimeMs / CACHE_BUCKET_MS) * CACHE_BUCKET_MS;
  const initial = at(bucketStart);
  const passed = [initial.rise, initial.set, initial.transit].some((event) => event && event.timeMs < civilTimeMs);
  return passed ? at(bucketStart + CACHE_BUCKET_MS) : initial;
};
