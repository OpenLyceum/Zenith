import { Body, Equator, Horizon, MakeTime, Observer, SiderealTime } from "astronomy-engine";
import { describe, expect, it } from "vitest";
import { localSiderealTimeHours, planetEquatorialState } from "../src/common/sky/PlanetEphemeris.js";
import { precessionMatrixAt, rotateEquatorial } from "../src/common/sky/Precession.js";
import { equatorialToHorizontal } from "../src/common/sky/SkyCoordinates.js";
import { DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG } from "../src/ZenithConstants.js";

describe("mean-of-date coordinate frame", () => {
  it("makes J2000.0 precession essentially the identity", () => {
    const matrix = precessionMatrixAt(Date.UTC(2000, 0, 1, 12));
    const point = rotateEquatorial(18.6153, 38.7837, matrix);
    expect(point.raHours).toBeCloseTo(18.6153, 10);
    expect(point.decDeg).toBeCloseTo(38.7837, 10);
  });

  it("matches an independent apparent-of-date Sun altitude at Boulder in 2100", () => {
    const epoch = Date.UTC(2100, 5, 21, 18);
    const observer = new Observer(DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG, 0);
    const time = MakeTime(new Date(epoch));
    const apparentEq = Equator(Body.Sun, time, observer, true, true);
    const expected = Horizon(time, observer, apparentEq.ra, apparentEq.dec).altitude;
    const state = planetEquatorialState("sun", epoch, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const lst = localSiderealTimeHours(epoch, DEFAULT_LONGITUDE_DEG);
    const actual = equatorialToHorizontal(state.raHours, state.decDeg, DEFAULT_LATITUDE_DEG, lst).altDeg;

    // Show the magnitude of the old J2000/apparent-LST frame mix in this fixture.
    const j2000 = Equator(Body.Sun, time, observer, false, true);
    const oldLst = SiderealTime(time) + DEFAULT_LONGITUDE_DEG / 15;
    const oldAltitude = equatorialToHorizontal(j2000.ra, j2000.dec, DEFAULT_LATITUDE_DEG, oldLst).altDeg;
    expect(Math.abs(oldAltitude - expected)).toBeGreaterThan(0.5);
    expect(Math.abs(actual - expected)).toBeLessThan(0.1);
  });
});
