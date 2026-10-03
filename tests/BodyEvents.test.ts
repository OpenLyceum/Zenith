import { Body, Equator, Horizon, MakeTime, Observer, SiderealTime } from "astronomy-engine";
import { describe, expect, it } from "vitest";
import { nextBodyEvents } from "../src/common/sky/BodyEvents.js";
import { localSiderealTimeHours, planetEquatorialState } from "../src/common/sky/PlanetEphemeris.js";
import { riseSetInfo, solarHoursUntilLst } from "../src/common/sky/SkyCoordinates.js";
import {
  DEFAULT_CIVIL_TIME_MS,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  SIDEREAL_HOURS_PER_SOLAR_HOUR,
} from "../src/ZenithConstants.js";

const OBSERVER = new Observer(DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG, 0);
const MS_PER_HOUR = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;
const SCAN_STEP_MS = 5 * 60 * 1000;
const SCAN_SPAN_MS = 48 * MS_PER_HOUR;
const SCAN_ACCURACY_MS = 1000;

// Independent reference path: astronomy-engine's apparent EQD coordinates,
// sidereal rotation, and unrefracted Horizon. Sample every five minutes, then
// bisect the first sign change to one second.
const altitudeAt = (body: Body, timeMs: number): number => {
  const time = MakeTime(new Date(timeMs));
  const eq = Equator(body, time, OBSERVER, true, true);
  return Horizon(time, OBSERVER, eq.ra, eq.dec).altitude;
};

const scanNextCrossing = (body: Body, startMs: number, direction: "rise" | "set"): number => {
  let beforeMs = startMs;
  let beforeAlt = altitudeAt(body, beforeMs);
  for (let afterMs = startMs + SCAN_STEP_MS; afterMs <= startMs + SCAN_SPAN_MS; afterMs += SCAN_STEP_MS) {
    const afterAlt = altitudeAt(body, afterMs);
    const crosses = direction === "rise" ? beforeAlt < 0 && afterAlt >= 0 : beforeAlt > 0 && afterAlt <= 0;
    if (crosses) {
      let low = beforeMs;
      let high = afterMs;
      while (high - low > SCAN_ACCURACY_MS) {
        const mid = (low + high) / 2;
        const midAlt = altitudeAt(body, mid);
        if ((direction === "rise" && midAlt < 0) || (direction === "set" && midAlt > 0)) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return (low + high) / 2;
    }
    beforeMs = afterMs;
    beforeAlt = afterAlt;
  }
  throw new Error("No horizon crossing found in the scan span");
};

const apparentHourAngle = (body: Body, timeMs: number): number => {
  const time = MakeTime(new Date(timeMs));
  const eq = Equator(body, time, OBSERVER, true, true);
  const raw =
    (((SiderealTime(time) + DEFAULT_LONGITUDE_DEG / 15 - eq.ra) % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  return raw >= HOURS_PER_DAY / 2 ? raw - HOURS_PER_DAY : raw;
};

const scanNextTransit = (body: Body, startMs: number): number => {
  let beforeMs = startMs;
  let beforeAngle = apparentHourAngle(body, beforeMs);
  for (let afterMs = startMs + SCAN_STEP_MS; afterMs <= startMs + SCAN_SPAN_MS; afterMs += SCAN_STEP_MS) {
    const afterAngle = apparentHourAngle(body, afterMs);
    if (beforeAngle < 0 && afterAngle >= 0) {
      let low = beforeMs;
      let high = afterMs;
      while (high - low > SCAN_ACCURACY_MS) {
        const mid = (low + high) / 2;
        if (apparentHourAngle(body, mid) < 0) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return (low + high) / 2;
    }
    beforeMs = afterMs;
    beforeAngle = afterAngle;
  }
  throw new Error("No upper transit found in the scan span");
};

describe("nextBodyEvents", () => {
  it("refines default Boulder Moonrise against an independent altitude scan", () => {
    const events = nextBodyEvents("moon", DEFAULT_CIVIL_TIME_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const scanned = scanNextCrossing(Body.Moon, DEFAULT_CIVIL_TIME_MS, "rise");
    expect(events.band).toBe("risesAndSets");
    expect(events.rise).not.toBeNull();
    expect(Math.abs((events.rise?.timeMs ?? 0) - scanned)).toBeLessThan(2 * 60 * 1000);
    expect(Math.abs(events.rise?.altitudeDeg ?? 99)).toBeLessThan(0.1);

    const moonNow = planetEquatorialState("moon", DEFAULT_CIVIL_TIME_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const fixed = riseSetInfo(moonNow.raHours, moonNow.decDeg, DEFAULT_LATITUDE_DEG);
    const fixedRiseMs =
      DEFAULT_CIVIL_TIME_MS +
      solarHoursUntilLst(
        localSiderealTimeHours(DEFAULT_CIVIL_TIME_MS, DEFAULT_LONGITUDE_DEG),
        fixed.riseLstHours ?? 0,
        SIDEREAL_HOURS_PER_SOLAR_HOUR,
      ) *
        MS_PER_HOUR;
    expect(Math.abs(fixedRiseMs - scanned)).toBeGreaterThan(20 * 60 * 1000);
  });

  it("refines the Moon's next set and upper transit", () => {
    const events = nextBodyEvents("moon", DEFAULT_CIVIL_TIME_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const scannedSet = scanNextCrossing(Body.Moon, DEFAULT_CIVIL_TIME_MS, "set");
    const scannedTransit = scanNextTransit(Body.Moon, DEFAULT_CIVIL_TIME_MS);
    expect(Math.abs((events.set?.timeMs ?? 0) - scannedSet)).toBeLessThan(2 * 60 * 1000);
    expect(Math.abs((events.transit?.timeMs ?? 0) - scannedTransit)).toBeLessThan(2 * 60 * 1000);
  });

  it("refines the next Boulder sunset against an independent altitude scan", () => {
    const events = nextBodyEvents("sun", DEFAULT_CIVIL_TIME_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const scanned = scanNextCrossing(Body.Sun, DEFAULT_CIVIL_TIME_MS, "set");
    expect(events.set).not.toBeNull();
    expect(Math.abs((events.set?.timeMs ?? 0) - scanned)).toBeLessThan(2 * 60 * 1000);
    expect(Math.abs(events.set?.altitudeDeg ?? 99)).toBeLessThan(0.1);
  });
});
