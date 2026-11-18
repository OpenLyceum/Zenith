/**
 * Checks for SelectedObjectReadout: the selected object's name follows a
 * language change. The empty-selection label updates before the star names, so
 * a readout that recomputed only on that label kept the previous translation.
 */

import { localeProperty } from "scenerystack/joist";
import { type Node, Text } from "scenerystack/scenery";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZenithPreferencesModel } from "../src/preferences/ZenithPreferencesModel.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";
import { SelectedObjectReadout } from "../src/zenith-screen/view/SelectedObjectReadout.js";

const originalStrings = window.phet["chipper"].strings;

// The shared setup registers only English. Register the sim's other locales for this suite
// so the framework's locale validation does not fall back to English on a language change.
beforeAll(() => {
  window.phet["chipper"].strings = { ...originalStrings, fr: {}, es: {} };
});

afterAll(() => {
  window.phet["chipper"].strings = originalStrings;
});

afterEach(() => {
  localeProperty.value = "en";
});

/** Every Text string under a node (direction markers stripped). */
const texts = (node: Node): string[] => {
  const own = node instanceof Text ? [node.string.replace(/[‪‫‬]/g, "")] : [];
  return [...own, ...node.children.flatMap(texts)];
};

describe("SelectedObjectReadout", () => {
  it("shows the selected star's name in the current language", () => {
    const model = new ZenithModel(new ZenithPreferencesModel());
    model.timer.isPlayingProperty.value = false;
    const readout = new SelectedObjectReadout(model);
    model.selectedObjectProperty.value = { kind: "star", id: "sirius", raHours: 6.7525, decDeg: -16.716, mag: -1.46 };
    expect(texts(readout)).toContain("Sirius");

    localeProperty.value = "es";
    expect(texts(readout)).toContain("Sirio");
    expect(texts(readout)).not.toContain("Sirius");

    localeProperty.value = "en";
    expect(texts(readout)).toContain("Sirius");

    model.selectedObjectProperty.value = { kind: "planet", id: "jupiter" };
    localeProperty.value = "es";
    expect(texts(readout)).toContain("Júpiter");

    readout.dispose();
    model.dispose();
  });
});
