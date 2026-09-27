/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 */

import { Bounds2 } from "scenerystack/dot";
import { Text } from "scenerystack/scenery";
import { describe, expect, it } from "vitest";
import { TimeModel } from "../src/common/TimeModel.js";
import { ZenithPreferencesModel } from "../src/preferences/ZenithPreferencesModel.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";
import { PlanetariumSkyNode } from "../src/zenith-screen/view/PlanetariumSkyNode.js";
import { SelectedObjectReadout } from "../src/zenith-screen/view/SelectedObjectReadout.js";
import { ZenithScreenView } from "../src/zenith-screen/view/ZenithScreenView.js";
import { describeDisposalLeaks, forceGC } from "./helpers/memoryLeak.js";

function createAndDisposeTimeModel(): WeakRef<object> {
  const model = new TimeModel();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

function createAndDisposeZenithModel(): WeakRef<object> {
  const preferences = new ZenithPreferencesModel();
  const model = new ZenithModel(preferences);
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

function createAndDisposePlanetariumSkyNode(): WeakRef<object> {
  const preferences = new ZenithPreferencesModel();
  const model = new ZenithModel(preferences);
  model.timer.isPlayingProperty.value = false;
  const skyNode = new PlanetariumSkyNode(model, { bounds: new Bounds2(0, 0, 800, 800) });
  const ref = new WeakRef<object>(skyNode);
  skyNode.dispose();
  model.dispose();
  return ref;
}

describe("Memory leak regression", () => {
  it("TimeModel is collected after dispose", async () => {
    const ref = createAndDisposeTimeModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("double dispose() does not throw", () => {
    const model = new TimeModel();
    model.dispose();
    expect(() => model.dispose()).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposeTimeModel());
    }
    await forceGC(refs);
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });

  describe("ZenithModel", () => {
    it("is collected after dispose", async () => {
      const ref = createAndDisposeZenithModel();
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });

    it("double dispose() does not throw", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      model.dispose();
      expect(() => model.dispose()).not.toThrow();
    });

    it("repeated create/dispose cycles leave no survivors", async () => {
      const refs: WeakRef<object>[] = [];
      for (let i = 0; i < 5; i++) {
        refs.push(createAndDisposeZenithModel());
      }
      await forceGC(refs);
      expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
    });
  });

  describe("PlanetariumSkyNode", () => {
    it("is collected after dispose", async () => {
      const ref = createAndDisposePlanetariumSkyNode();
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });

    it("double dispose() does not throw", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      const skyNode = new PlanetariumSkyNode(model, { bounds: new Bounds2(0, 0, 800, 800) });
      skyNode.dispose();
      expect(() => skyNode.dispose()).not.toThrow();
      model.dispose();
    });

    it("repeated create/dispose cycles leave no survivors", async () => {
      const refs: WeakRef<object>[] = [];
      for (let i = 0; i < 5; i++) {
        refs.push(createAndDisposePlanetariumSkyNode());
      }
      await forceGC(refs);
      expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
    });

    it("disposes its child label subtree (no StringManager retention)", async () => {
      // `Node.dispose()` only detaches children; the label Text nodes forward to
      // shared StringManager Properties. If the subtree is not disposed, a
      // cardinal label stays retained by that (sim-lifetime) singleton and never
      // collects — even though the sky node itself detaches and collects. The
      // sky node is scoped inside the helper so the label's only possible
      // retainer is the StringManager subscription.
      const labelRef = (() => {
        const preferences = new ZenithPreferencesModel();
        const model = new ZenithModel(preferences);
        model.timer.isPlayingProperty.value = false;
        const skyNode = new PlanetariumSkyNode(model, { bounds: new Bounds2(0, 0, 800, 800) });
        const labelChild = skyNode.children.find((child): child is Text => child instanceof Text);
        expect(labelChild).toBeDefined();
        const ref = new WeakRef<object>(labelChild as object);
        skyNode.dispose();
        model.dispose();
        return ref;
      })();
      await forceGC(labelRef);
      expect(labelRef.deref()).toBeUndefined();
    });
  });

  describe("SelectedObjectReadout", () => {
    it("is collected after dispose", async () => {
      const ref = (() => {
        const preferences = new ZenithPreferencesModel();
        const model = new ZenithModel(preferences);
        model.timer.isPlayingProperty.value = false;
        const readout = new SelectedObjectReadout(model);
        const weak = new WeakRef<object>(readout);
        readout.dispose();
        model.dispose();
        return weak;
      })();
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });

    it("stops observing the model after dispose", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      model.timer.isPlayingProperty.value = false;
      const readout = new SelectedObjectReadout(model);
      readout.dispose();

      // The readout derives coordinates, rise/set times and the constellation
      // name from these; after dispose none of that may still be listening.
      expect(() => {
        model.civilTimeMsProperty.value += 3_600_000;
        model.latitudeProperty.value = -33.9;
        model.selectedObjectProperty.value = null;
      }).not.toThrow();

      model.dispose();
    });

    it("double dispose() does not throw", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      const readout = new SelectedObjectReadout(model);
      readout.dispose();
      expect(() => readout.dispose()).not.toThrow();
      model.dispose();
    });
  });

  describe("ZenithScreenView", () => {
    // Full ScreenView GC is not asserted here: joist `ScreenView` plus sun
    // ComboBox / NumberControl / localized string Properties retain a graph that
    // survives Node.dispose(). Listener teardown (the fuzz-leak regression) is
    // what we lock down below; model + PlanetariumSkyNode GC cover the owned
    // subscription surface.

    it("double dispose() does not throw", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      const screenView = new ZenithScreenView(model);
      screenView.dispose();
      expect(() => screenView.dispose()).not.toThrow();
      model.dispose();
    });

    it("mutating model Properties after dispose does not throw through dead listeners", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      model.timer.isPlayingProperty.value = false;
      const screenView = new ZenithScreenView(model);
      screenView.dispose();

      // Previously-linked look / time Properties must no longer notify disposed view listeners.
      expect(() => {
        model.lookAzimuthDegProperty.value = (model.lookAzimuthDegProperty.value + 15) % 360;
        model.lookAltitudeDegProperty.value = 25;
        model.fieldOfViewDegProperty.value = 100;
        model.civilTimeMsProperty.value += 3_600_000;
      }).not.toThrow();

      model.dispose();
    });
  });
});

describeDisposalLeaks([{ name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true }]);
