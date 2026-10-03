/**
 * PlanetEphemeris.test.ts
 *
 * Pins astronomy-engine positions for a documented epoch so regressions in the
 * wrapper (frame choice, LST formula) are caught.
 */
import { describe, expect, it } from "vitest";
import {
  angularDiameterToRadiusPx,
  apparentAngularDiameterDeg,
  localSiderealTimeHours,
  moonPhaseState,
  planetEquatorialState,
} from "../src/common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal } from "../src/common/sky/SkyCoordinates.js";
import { DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG } from "../src/ZenithConstants.js";
import { solarSystemBodyVisual } from "../src/zenith-screen/model/SolarSystemBodies.js";

/** 2024-06-21 18:00 UTC ≈ noon Mountain Daylight Time (summer solstice). */
const EPOCH_MS = Date.UTC(2024, 5, 21, 18, 0, 0);

describe("localSiderealTimeHours", () => {
  it("returns a value in [0, 24)", () => {
    const lst = localSiderealTimeHours(EPOCH_MS, DEFAULT_LONGITUDE_DEG);
    expect(lst).toBeGreaterThanOrEqual(0);
    expect(lst).toBeLessThan(24);
  });
});

describe("planetEquatorialState", () => {
  it("places the Sun near RA 6h and Dec +23° at the June solstice epoch", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    expect(sun.raHours).toBeGreaterThan(5.5);
    expect(sun.raHours).toBeLessThan(6.5);
    expect(sun.decDeg).toBeGreaterThan(22);
    expect(sun.decDeg).toBeLessThan(24);
    expect(sun.mag).toBeLessThan(-20);
  });

  it("places the Sun high in the southern sky at Boulder near local noon", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const lst = localSiderealTimeHours(EPOCH_MS, DEFAULT_LONGITUDE_DEG);
    const { altDeg, azDeg } = equatorialToHorizontal(sun.raHours, sun.decDeg, DEFAULT_LATITUDE_DEG, lst);
    // Summer noon at ~40°N: Sun well above horizon, roughly south.
    expect(altDeg).toBeGreaterThan(50);
    expect(azDeg).toBeGreaterThan(90);
    expect(azDeg).toBeLessThan(270);
  });

  it("returns finite Mars magnitude and coordinates", () => {
    const mars = planetEquatorialState("mars", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    expect(Number.isFinite(mars.raHours)).toBe(true);
    expect(Number.isFinite(mars.decDeg)).toBe(true);
    expect(Number.isFinite(mars.mag)).toBe(true);
  });

  it("returns a Moon position distinct from the Sun", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const moon = planetEquatorialState("moon", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const dra = Math.abs(sun.raHours - moon.raHours);
    expect(dra > 0.1 || Math.abs(sun.decDeg - moon.decDeg) > 0.1).toBe(true);
  });

  it("returns a finite topocentric distance for Sun and Moon", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const moon = planetEquatorialState("moon", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    expect(sun.distAu).toBeGreaterThan(0.9);
    expect(sun.distAu).toBeLessThan(1.1);
    expect(moon.distAu).toBeGreaterThan(0.002);
    expect(moon.distAu).toBeLessThan(0.003);
  });
});

describe("apparentAngularDiameterDeg", () => {
  it("gives the Sun and Moon roughly half-degree discs at the solstice epoch", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const moon = planetEquatorialState("moon", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const sunDeg = apparentAngularDiameterDeg(solarSystemBodyVisual("sun").radiusKm, sun.distAu);
    const moonDeg = apparentAngularDiameterDeg(solarSystemBodyVisual("moon").radiusKm, moon.distAu);
    expect(sunDeg).toBeGreaterThan(0.5);
    expect(sunDeg).toBeLessThan(0.55);
    expect(moonDeg).toBeGreaterThan(0.45);
    expect(moonDeg).toBeLessThan(0.6);
  });

  it("makes Jupiter much smaller than the Moon at the same epoch", () => {
    const moon = planetEquatorialState("moon", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const jupiter = planetEquatorialState("jupiter", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const moonDeg = apparentAngularDiameterDeg(solarSystemBodyVisual("moon").radiusKm, moon.distAu);
    const jupiterDeg = apparentAngularDiameterDeg(solarSystemBodyVisual("jupiter").radiusKm, jupiter.distAu);
    expect(jupiterDeg).toBeLessThan(moonDeg / 10);
  });
});

describe("angularDiameterToRadiusPx", () => {
  it("scales disc radius with FOV degrees-per-pixel", () => {
    // 0.5° diameter at 0.05 °/px → radius 5 px
    expect(angularDiameterToRadiusPx(0.5, 0.05, 0.75)).toBeCloseTo(5, 6);
  });

  it("respects the minimum radius floor", () => {
    expect(angularDiameterToRadiusPx(0.001, 1, 0.75)).toBe(0.75);
  });

  it("uses true Sun and Moon angular radii after zooming past their visibility floors", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const moon = planetEquatorialState("moon", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    for (const [id, distance] of [
      ["sun", sun.distAu],
      ["moon", moon.distAu],
    ] as const) {
      const visual = solarSystemBodyVisual(id);
      const diameter = apparentAngularDiameterDeg(visual.radiusKm, distance);
      expect(angularDiameterToRadiusPx(diameter, 0.2, visual.minDiscRadiusPx)).toBe(visual.minDiscRadiusPx);
      expect(angularDiameterToRadiusPx(diameter, 0.01, visual.minDiscRadiusPx)).toBeCloseTo(diameter / 0.02, 8);
    }
  });
});

describe("moonPhaseState", () => {
  it("reports near-full illumination near a documented full Moon", () => {
    // 2024-06-22 ~01:08 UTC full Moon (astronomy-engine / USNO-adjacent).
    const fullMs = Date.UTC(2024, 5, 22, 1, 8, 0);
    const phase = moonPhaseState(fullMs);
    expect(phase.phaseFraction).toBeGreaterThan(0.95);
    expect(phase.phaseAngleDeg).toBeLessThan(20);
  });

  it("reports near-new illumination near a documented new Moon", () => {
    // 2024-07-05 ~22:57 UTC new Moon.
    const newMs = Date.UTC(2024, 6, 5, 22, 57, 0);
    const phase = moonPhaseState(newMs);
    expect(phase.phaseFraction).toBeLessThan(0.05);
    expect(phase.phaseAngleDeg).toBeGreaterThan(160);
  });

  it("is waxing at first quarter and waning at third quarter", () => {
    // 2024-05-15 ~11:48 UTC first quarter.
    const firstQ = moonPhaseState(Date.UTC(2024, 4, 15, 11, 48, 0));
    expect(firstQ.waxing).toBe(true);
    expect(firstQ.phaseFraction).toBeGreaterThan(0.4);
    expect(firstQ.phaseFraction).toBeLessThan(0.6);

    // 2024-05-30 ~17:13 UTC third quarter.
    const thirdQ = moonPhaseState(Date.UTC(2024, 4, 30, 17, 13, 0));
    expect(thirdQ.waxing).toBe(false);
    expect(thirdQ.phaseFraction).toBeGreaterThan(0.4);
    expect(thirdQ.phaseFraction).toBeLessThan(0.6);
  });
});
