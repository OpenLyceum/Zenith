/**
 * ZenithModel.test.ts
 *
 * Covers observer defaults, look/FOV state, civil-time advance, and LST sync.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { localSiderealTimeHours } from "../src/common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal } from "../src/common/sky/SkyCoordinates.js";
import { ZenithPreferencesModel } from "../src/preferences/ZenithPreferencesModel.js";
import {
  CIVIL_HOURS_PER_SIM_SECOND,
  CIVIL_TIME_MS_RANGE,
  DEFAULT_CIVIL_TIME_MS,
  DEFAULT_FIELD_OF_VIEW_DEG,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  DEFAULT_LOOK_ALTITUDE_DEG,
  DEFAULT_LOOK_AZIMUTH_DEG,
  DEFAULT_SHOW_ATMOSPHERE,
  FIELD_OF_VIEW_RANGE,
  FOV_KEYBOARD_STEP_DEG,
  LOOK_ALTITUDE_RANGE,
} from "../src/ZenithConstants.js";
import { EPOCH_PRESET_CIVIL_MS, EpochPreset } from "../src/zenith-screen/model/EpochPreset.js";
import { LocationPreset } from "../src/zenith-screen/model/LocationPreset.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";

describe("ZenithModel", () => {
  let preferences: ZenithPreferencesModel;
  let model: ZenithModel;

  beforeEach(() => {
    preferences = new ZenithPreferencesModel();
    model = new ZenithModel(preferences);
  });

  it("starts with Boulder defaults, southward look, epoch civil time, and a playing timer", () => {
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE_DEG);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE_DEG);
    expect(model.civilTimeMsProperty.value).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(DEFAULT_CIVIL_TIME_MS, DEFAULT_LONGITUDE_DEG),
      10,
    );
    expect(model.lookAzimuthDegProperty.value).toBe(DEFAULT_LOOK_AZIMUTH_DEG);
    expect(model.lookAltitudeDegProperty.value).toBe(DEFAULT_LOOK_ALTITUDE_DEG);
    expect(model.fieldOfViewDegProperty.value).toBe(DEFAULT_FIELD_OF_VIEW_DEG);
    expect(model.showPlanetsProperty.value).toBe(true);
    expect(model.trueScaleBodiesProperty.value).toBe(false);
    expect(model.showAtmosphereProperty.value).toBe(DEFAULT_SHOW_ATMOSPHERE);
    expect(model.timer.isPlayingProperty.value).toBe(true);
    expect(model.timeRateProperty.value).toBe(1);
  });

  it("advances civil time while playing at NORMAL speed and keeps LST in sync", () => {
    model.step(2);
    const expectedCivil = DEFAULT_CIVIL_TIME_MS + 2 * CIVIL_HOURS_PER_SIM_SECOND * 3600 * 1000;
    expect(model.civilTimeMsProperty.value).toBe(expectedCivil);
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(expectedCivil, DEFAULT_LONGITUDE_DEG),
      10,
    );
  });

  it("scales civil advance when the time rate is increased", () => {
    model.increaseTimeRate();
    const rate = model.timeRateProperty.value;
    expect(rate).toBeGreaterThan(1);
    model.step(1);
    const expectedCivil = DEFAULT_CIVIL_TIME_MS + rate * CIVIL_HOURS_PER_SIM_SECOND * 3600 * 1000;
    expect(model.civilTimeMsProperty.value).toBe(expectedCivil);
  });

  it("runs civil time backward once the rate is decreased past 1×", () => {
    // From the default 1× forward, one decrease crosses zero straight into reverse.
    model.decreaseTimeRate();
    expect(model.timeRateProperty.value).toBeLessThan(0);
    model.step(1);
    expect(model.civilTimeMsProperty.value).toBeLessThan(DEFAULT_CIVIL_TIME_MS);
  });

  it("resetTimeRate restores the normal forward rate from anywhere on the ladder", () => {
    model.decreaseTimeRate();
    model.decreaseTimeRate();
    expect(model.timeRateProperty.value).not.toBe(1);
    model.resetTimeRate();
    expect(model.timeRateProperty.value).toBe(1);
  });

  it("lookToward spins azimuth (wrapped) and range-constrains altitude", () => {
    // With the horizon shown (default) the view cannot drop below the horizon.
    model.lookToward(-45, 200);
    expect(model.lookAzimuthDegProperty.value).toBeCloseTo(315, 10);
    expect(model.lookAltitudeDegProperty.value).toBe(LOOK_ALTITUDE_RANGE.max);
    model.lookToward(720, -50);
    expect(model.lookAzimuthDegProperty.value).toBeCloseTo(0, 10);
    expect(model.lookAltitudeDegProperty.value).toBe(0);

    // Hiding the horizon frees the view to look down to the nadir.
    model.showHorizonProperty.value = false;
    model.lookToward(0, -1000);
    expect(model.lookAltitudeDegProperty.value).toBe(LOOK_ALTITUDE_RANGE.min);
  });

  it("zoomBy narrows and widens the field of view and clamps to the range", () => {
    model.zoomBy(-FOV_KEYBOARD_STEP_DEG);
    expect(model.fieldOfViewDegProperty.value).toBe(DEFAULT_FIELD_OF_VIEW_DEG - FOV_KEYBOARD_STEP_DEG);
    // A large negative delta cannot jump below the FOV floor.
    model.zoomBy(-1e6);
    expect(model.fieldOfViewDegProperty.value).toBe(FIELD_OF_VIEW_RANGE.min);
    // A large positive delta cannot jump above the FOV ceiling.
    model.zoomBy(1e6);
    expect(model.fieldOfViewDegProperty.value).toBe(FIELD_OF_VIEW_RANGE.max);
  });

  it("does not advance when paused", () => {
    model.timer.isPlayingProperty.value = false;
    const lst0 = model.localSiderealTimeHoursProperty.value;
    model.step(10);
    expect(model.civilTimeMsProperty.value).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(model.localSiderealTimeHoursProperty.value).toBe(lst0);
  });

  it("resyncs LST when longitude changes", () => {
    model.longitudeProperty.value = 0;
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(DEFAULT_CIVIL_TIME_MS, 0),
      10,
    );
  });

  it("wraps sidereal time into [0, 24) via civil-time scrub", () => {
    model.advanceSiderealTime(30);
    expect(model.localSiderealTimeHoursProperty.value).toBeGreaterThanOrEqual(0);
    expect(model.localSiderealTimeHoursProperty.value).toBeLessThan(24);
  });

  it("advances local sidereal time by the requested sidereal hours", () => {
    const lst0 = model.localSiderealTimeHoursProperty.value;
    model.advanceSiderealTime(6);
    // GAST is not perfectly linear, so allow a couple of arcseconds of slack.
    const expected = (((lst0 + 6) % 24) + 24) % 24;
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(expected, 3);
  });

  it("returns the star field to place after one full sidereal day, with civil time ~23h56m", () => {
    const lst0 = model.localSiderealTimeHoursProperty.value;
    const civil0 = model.civilTimeMsProperty.value;
    model.advanceSiderealTime(24);
    const civilHoursAdvanced = (model.civilTimeMsProperty.value - civil0) / (3600 * 1000);
    // A sidereal day is ~23h56m of civil time — the sidereal-vs-solar distinction.
    expect(civilHoursAdvanced).toBeGreaterThan(23.9);
    expect(civilHoursAdvanced).toBeLessThan(24);
    // LST (and therefore the stars) returns to place far more precisely than the
    // ~3.9 min error a naive 24h civil scrub would leave.
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(lst0, 2);
  });

  it("reset restores look, FOV, session toggles, civil time, and observer state", () => {
    model.latitudeProperty.value = 10;
    model.longitudeProperty.value = 20;
    model.lookAzimuthDegProperty.value = 90;
    model.lookAltitudeDegProperty.value = 60;
    model.fieldOfViewDegProperty.value = 80;
    model.showGridProperty.value = false;
    model.showPlanetsProperty.value = false;
    model.trueScaleBodiesProperty.value = true;
    model.showAtmosphereProperty.value = false;
    model.showStarLabelsProperty.value = false;
    model.showConstellationsProperty.value = true;
    model.showPlanetLabelsProperty.value = false;
    model.magnitudeLimitProperty.value = 3;
    model.selectedObjectProperty.value = {
      kind: "star",
      id: "vega",
      raHours: 18.6,
      decDeg: 38.8,
      mag: 0.03,
    };
    model.step(5);
    model.reset();
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE_DEG);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE_DEG);
    expect(model.civilTimeMsProperty.value).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(DEFAULT_CIVIL_TIME_MS, DEFAULT_LONGITUDE_DEG),
      10,
    );
    expect(model.lookAzimuthDegProperty.value).toBe(DEFAULT_LOOK_AZIMUTH_DEG);
    expect(model.lookAltitudeDegProperty.value).toBe(DEFAULT_LOOK_ALTITUDE_DEG);
    expect(model.fieldOfViewDegProperty.value).toBe(DEFAULT_FIELD_OF_VIEW_DEG);
    expect(model.showGridProperty.value).toBe(true);
    expect(model.showPlanetsProperty.value).toBe(true);
    expect(model.trueScaleBodiesProperty.value).toBe(false);
    expect(model.showAtmosphereProperty.value).toBe(DEFAULT_SHOW_ATMOSPHERE);
    // Preference-backed overlays outlive Reset All.
    expect(model.showStarLabelsProperty.value).toBe(false);
    expect(model.showConstellationsProperty.value).toBe(true);
    expect(model.showPlanetLabelsProperty.value).toBe(false);
    expect(model.magnitudeLimitProperty.value).toBe(5.5);
    expect(model.selectedObjectProperty.value).toBeNull();
    expect(model.timer.timeProperty.value).toBe(0);
  });

  it("tracking centers the look on the selected object and follows it as time advances", () => {
    const vega = { kind: "star" as const, id: "vega", raHours: 18.6153, decDeg: 38.7837, mag: 0.03 };
    // Hide the horizon so the look altitude is unclamped and matches exactly.
    model.showHorizonProperty.value = false;
    model.selectedObjectProperty.value = vega;
    model.trackSelectedObjectProperty.value = true;

    const lat = model.latitudeProperty.value;
    const expected0 = equatorialToHorizontal(
      vega.raHours,
      vega.decDeg,
      lat,
      model.localSiderealTimeHoursProperty.value,
      model.precessionMatrix,
    );
    expect(model.lookAzimuthDegProperty.value).toBeCloseTo(expected0.azDeg, 6);
    expect(model.lookAltitudeDegProperty.value).toBeCloseTo(expected0.altDeg, 6);

    // Advancing time moves the star; the tracked look follows.
    model.advanceSiderealTime(6);
    const expected1 = equatorialToHorizontal(
      vega.raHours,
      vega.decDeg,
      lat,
      model.localSiderealTimeHoursProperty.value,
      model.precessionMatrix,
    );
    expect(model.lookAzimuthDegProperty.value).toBeCloseTo(expected1.azDeg, 6);
    expect(model.lookAltitudeDegProperty.value).toBeCloseTo(expected1.altDeg, 6);
    expect(model.trackSelectedObjectProperty.value).toBe(true);
  });

  it("a time step re-aims the tracker once, never through a stale LST", () => {
    // A planet, not a star: its position comes from the ephemeris snapshot, so a
    // fresh snapshot paired with a stale LST would aim somewhere wrong first.
    model.showHorizonProperty.value = false;
    model.selectedObjectProperty.value = { kind: "planet", id: "moon" };
    model.trackSelectedObjectProperty.value = true;

    const azimuthWrites: number[] = [];
    model.lookAzimuthDegProperty.lazyLink((az) => azimuthWrites.push(az));
    model.advanceSiderealTime(1);

    expect(azimuthWrites).toHaveLength(1);
    const moon = model.skySnapshotProperty.value.byId.get("moon");
    expect(moon).toBeDefined();
    if (moon) {
      const { azDeg } = equatorialToHorizontal(
        moon.raHours,
        moon.decDeg,
        model.latitudeProperty.value,
        localSiderealTimeHours(model.civilTimeMsProperty.value, model.longitudeProperty.value),
      );
      expect(azimuthWrites[0]).toBeCloseTo(azDeg, 6);
    }
  });

  it("derives LST and solar altitude from the same sky snapshot", () => {
    model.advanceCivilTimeHours(5);
    const snapshot = model.skySnapshotProperty.value;
    expect(model.localSiderealTimeHoursProperty.value).toBe(snapshot.localSiderealTimeHours);
    const sun = snapshot.byId.get("sun");
    expect(sun).toBeDefined();
    if (sun) {
      const { altDeg } = equatorialToHorizontal(
        sun.raHours,
        sun.decDeg,
        model.latitudeProperty.value,
        model.localSiderealTimeHoursProperty.value,
      );
      expect(model.solarAltitudeDegProperty.value).toBeCloseTo(altDeg, 10);
    }
  });

  it("a manual pan cancels tracking", () => {
    model.showHorizonProperty.value = false;
    model.selectedObjectProperty.value = { kind: "star", id: "vega", raHours: 18.6153, decDeg: 38.7837, mag: 0.03 };
    model.trackSelectedObjectProperty.value = true;
    expect(model.trackSelectedObjectProperty.value).toBe(true);

    // A user look change (drag / arrow / quick-look mutates these Properties) stops tracking.
    model.lookAzimuthDegProperty.value += 10;
    expect(model.trackSelectedObjectProperty.value).toBe(false);
  });

  it("derives solar altitude above 50° at Boulder near local noon on the June solstice", () => {
    expect(model.solarAltitudeDegProperty.value).toBeGreaterThan(50);
  });

  it("cycles measure endpoints and derives their angular separation", () => {
    expect(model.measureSeparationDegProperty.value).toBeNull();
    model.addMeasurePoint({ raHours: 0, decDeg: 0 });
    expect(model.measureStartProperty.value).not.toBeNull();
    expect(model.measureEndProperty.value).toBeNull();
    expect(model.measureSeparationDegProperty.value).toBeNull();

    model.addMeasurePoint({ raHours: 6, decDeg: 0 }); // 90° apart on the equator
    expect(model.measureSeparationDegProperty.value).toBeCloseTo(90, 4);

    // A third point starts a fresh measurement.
    model.addMeasurePoint({ raHours: 12, decDeg: 0 });
    expect(model.measureEndProperty.value).toBeNull();
    expect(model.measureSeparationDegProperty.value).toBeNull();

    model.clearMeasurement();
    expect(model.measureStartProperty.value).toBeNull();
  });

  it("applies location presets to latitude and longitude", () => {
    model.locationPresetProperty.value = LocationPreset.GREENWICH;
    expect(model.latitudeProperty.value).toBe(51.5);
    expect(model.longitudeProperty.value).toBe(0);
  });

  it("marks location CUSTOM when latitude is scrubbed manually", () => {
    model.latitudeProperty.value = 12;
    expect(model.locationPresetProperty.value).toBe(LocationPreset.CUSTOM);
  });

  it("applies epoch presets to civil time", () => {
    model.epochPresetProperty.value = EpochPreset.DECEMBER_SOLSTICE;
    expect(model.civilTimeMsProperty.value).toBe(EPOCH_PRESET_CIVIL_MS.get(EpochPreset.DECEMBER_SOLSTICE));
  });

  it("marks epoch CUSTOM when civil time is set to an arbitrary date", () => {
    model.civilTimeMsProperty.value = Date.UTC(2020, 0, 1, 3, 0, 0);
    expect(model.epochPresetProperty.value).toBe(EpochPreset.CUSTOM);
    expect(model.civilTimeMsProperty.value).toBe(Date.UTC(2020, 0, 1, 3, 0, 0));
  });

  it("keeps the epoch preset selected while the clock ticks within the readout's precision", () => {
    // The timer starts playing, so the first step advances civil time by a few
    // milliseconds. That must not flip the combo to CUSTOM while the UTC readout
    // (minute precision) still shows the preset epoch.
    model.epochPresetProperty.value = EpochPreset.DECEMBER_SOLSTICE;
    model.step(1 / 60);
    expect(model.epochPresetProperty.value).toBe(EpochPreset.DECEMBER_SOLSTICE);
  });

  it("marks epoch CUSTOM once the clock has moved a full minute off the preset", () => {
    model.epochPresetProperty.value = EpochPreset.DECEMBER_SOLSTICE;
    model.advanceCivilTimeHours(1 / 60);
    expect(model.epochPresetProperty.value).toBe(EpochPreset.CUSTOM);
  });

  it("holds civil time inside the supported year range", () => {
    model.setCivilTimeMs(CIVIL_TIME_MS_RANGE.max + 5 * 365 * 24 * 3600 * 1000);
    expect(model.civilTimeMsProperty.value).toBe(CIVIL_TIME_MS_RANGE.max);

    model.setCivilTimeMs(CIVIL_TIME_MS_RANGE.min - 5 * 365 * 24 * 3600 * 1000);
    expect(model.civilTimeMsProperty.value).toBe(CIVIL_TIME_MS_RANGE.min);
  });

  it("stops the clock at the range edge instead of playing past it", () => {
    model.setCivilTimeMs(CIVIL_TIME_MS_RANGE.max);
    model.advanceCivilTimeHours(48);
    expect(model.civilTimeMsProperty.value).toBe(CIVIL_TIME_MS_RANGE.max);
  });
});
