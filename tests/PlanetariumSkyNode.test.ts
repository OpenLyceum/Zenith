/**
 * PlanetariumSkyNode.test.ts
 *
 * Public selection / bounds API — no render-output assertions.
 */

import { Bounds2, Vector2 } from "scenerystack/dot";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { equatorialToHorizontal, horizontalToEquatorial } from "../src/common/sky/SkyCoordinates.js";
import { ZenithPreferencesModel } from "../src/preferences/ZenithPreferencesModel.js";
import { SELECTION_HIT_RADIUS_PX } from "../src/ZenithConstants.js";
import type { SelectedSkyObject } from "../src/zenith-screen/model/SelectedSkyObject.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";
import { PlanetariumSkyNode } from "../src/zenith-screen/view/PlanetariumSkyNode.js";
import { SkyProjection } from "../src/zenith-screen/view/SkyProjection.js";

const VIEW_BOUNDS = new Bounds2(0, 0, 800, 800);

const projectionFor = (model: ZenithModel): SkyProjection =>
  new SkyProjection({
    bounds: VIEW_BOUNDS,
    lookAzimuthDeg: model.lookAzimuthDegProperty.value,
    lookAltitudeDeg: model.lookAltitudeDegProperty.value,
    fieldOfViewDeg: model.fieldOfViewDegProperty.value,
  });

const projectObject = (model: ZenithModel, object: SelectedSkyObject): Vector2 | null => {
  const eq = model.equatorialOfSelected(object);
  if (!eq) {
    return null;
  }
  const { altDeg, azDeg } = equatorialToHorizontal(
    eq.raHours,
    eq.decDeg,
    model.latitudeProperty.value,
    model.localSiderealTimeHoursProperty.value,
  );
  return projectionFor(model).project(altDeg, azDeg);
};

describe("PlanetariumSkyNode", () => {
  let preferences: ZenithPreferencesModel;
  let model: ZenithModel;
  let skyNode: PlanetariumSkyNode;

  beforeEach(() => {
    preferences = new ZenithPreferencesModel();
    model = new ZenithModel(preferences);
    model.timer.isPlayingProperty.value = false;
    skyNode = new PlanetariumSkyNode(model, { bounds: VIEW_BOUNDS });
  });

  it("constructs without throwing", () => {
    expect(skyNode).toBeInstanceOf(PlanetariumSkyNode);
  });

  it("setViewBounds updates getViewBounds", () => {
    const next = new Bounds2(10, 20, 610, 420);
    skyNode.setViewBounds(next);
    expect(skyNode.getViewBounds()).toEqual(next);
  });

  it("listSelectableObjectsInView sorts west→east then low→high (x asc, y desc)", () => {
    const objects = skyNode.listSelectableObjectsInView();
    expect(objects.length).toBeGreaterThan(1);

    const points: Vector2[] = [];
    for (const object of objects) {
      const point = projectObject(model, object);
      expect(point).not.toBeNull();
      if (point) {
        points.push(point);
      }
    }

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      if (!(prev && curr)) {
        continue;
      }
      const xOrdered = curr.x > prev.x || (curr.x === prev.x && curr.y <= prev.y);
      expect(xOrdered).toBe(true);
    }
  });

  it("returns an empty selectable list when stars are washed out and planets are hidden", () => {
    model.showPlanetsProperty.value = false;
    model.showAtmosphereProperty.value = true;
    // Default civil time is local noon at Boulder — with atmosphere on, stars wash out.
    skyNode.updateDirty();
    expect(skyNode.listSelectableObjectsInView()).toEqual([]);
  });

  it("findNearestObject returns a named star near its projected position", () => {
    const star = skyNode.listSelectableObjectsInView().find((o) => o.kind === "star");
    expect(star).toBeDefined();
    if (!star) {
      return;
    }

    const point = projectObject(model, star);
    expect(point).not.toBeNull();
    if (!point) {
      return;
    }

    const nearest = skyNode.findNearestObject(point);
    expect(nearest).not.toBeNull();
    expect(nearest?.kind).toBe("star");
    expect(nearest?.id).toBe(star.id);
  });

  it("findNearestObject returns null far from every selectable", () => {
    expect(skyNode.findNearestObject(new Vector2(VIEW_BOUNDS.minX, VIEW_BOUNDS.minY))).toBeNull();
  });

  it("equatorialAtViewPoint snaps to a nearby selectable, else inverse-projects", () => {
    const star = skyNode.listSelectableObjectsInView().find((o) => o.kind === "star");
    expect(star).toBeDefined();
    if (!star) {
      return;
    }

    const eq = model.equatorialOfSelected(star);
    expect(eq).not.toBeNull();
    if (!eq) {
      return;
    }

    const starPoint = projectObject(model, star);
    expect(starPoint).not.toBeNull();
    if (!starPoint) {
      return;
    }

    const snapped = skyNode.equatorialAtViewPoint(starPoint);
    expect(snapped.raHours).toBeCloseTo(eq.raHours, 6);
    expect(snapped.decDeg).toBeCloseTo(eq.decDeg, 6);

    const empty = new Vector2(VIEW_BOUNDS.minX + 5, VIEW_BOUNDS.minY + 5);
    expect(skyNode.findNearestObject(empty)).toBeNull();
    const unprojected = projectionFor(model).unproject(empty);
    const skyEq = skyNode.equatorialAtViewPoint(empty);
    const expected = horizontalToEquatorial(
      unprojected.altDeg,
      unprojected.azDeg,
      model.latitudeProperty.value,
      model.localSiderealTimeHoursProperty.value,
    );
    expect(skyEq.raHours).toBeCloseTo(expected.raHours, 6);
    expect(skyEq.decDeg).toBeCloseTo(expected.decDeg, 6);
  });

  it("findNearestObject sees post-pan geometry after updateDirty (Low #7)", () => {
    const beforeObjects = skyNode.listSelectableObjectsInView().filter((o) => o.kind === "star");
    expect(beforeObjects.length).toBeGreaterThan(0);
    const star = beforeObjects[0];
    expect(star).toBeDefined();
    if (!star) {
      return;
    }

    const pointBefore = projectObject(model, star);
    expect(pointBefore).not.toBeNull();
    if (!pointBefore) {
      return;
    }
    expect(skyNode.findNearestObject(pointBefore)?.id).toBe(star.id);

    // Pan ~90° so the old screen position no longer maps to that star.
    model.lookAzimuthDegProperty.value = (model.lookAzimuthDegProperty.value + 90) % 360;
    skyNode.updateDirty();

    const pointAfter = projectObject(model, star);
    expect(pointAfter).not.toBeNull();
    if (!pointAfter) {
      return;
    }
    // Post-pan: hit-test at the *new* projected position finds the star; the old
    // pixel (pre-pan) must not falsely report it via a stale projection.
    expect(skyNode.findNearestObject(pointAfter)?.id).toBe(star.id);
    if (pointBefore.distance(pointAfter) > SELECTION_HIT_RADIUS_PX) {
      const staleHit = skyNode.findNearestObject(pointBefore);
      expect(staleHit?.id === star.id).toBe(false);
    }
  });

  it("rebuilds the alt/az frame layers only when the frame moves, not when time advances", () => {
    // Private hook: the alt/az grid is the costliest frame-anchored layer.
    const gridShapeSpy = vi.spyOn(skyNode as unknown as { altAzGridShape: () => unknown }, "altAzGridShape");
    model.showGridProperty.value = true;
    skyNode.updateDirty();
    expect(gridShapeSpy).toHaveBeenCalledTimes(1);

    model.advanceCivilTimeHours(1);
    skyNode.updateDirty();
    expect(gridShapeSpy).toHaveBeenCalledTimes(1);

    model.lookToward(90, 20);
    skyNode.updateDirty();
    expect(gridShapeSpy).toHaveBeenCalledTimes(2);
  });
});
