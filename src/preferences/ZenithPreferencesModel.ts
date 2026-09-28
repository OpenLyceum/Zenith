/**
 * ZenithPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in zenithQueryParameters.
 *
 * Overlay toggles (star names, constellation lines, planet labels) outlive
 * Reset All, so this model has no reset().
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import ZenithNamespace from "../ZenithNamespace.js";
import zenithQueryParameters from "./zenithQueryParameters.js";

export class ZenithPreferencesModel {
  /** Whether curated bright-star name labels are drawn. */
  public readonly showStarLabelsProperty: BooleanProperty;

  /** Whether classroom constellation stick figures are drawn. */
  public readonly showConstellationsProperty: BooleanProperty;

  /** Whether preferred planet name labels are drawn. */
  public readonly showPlanetLabelsProperty: BooleanProperty;

  /**
   * Whether the deeper Hipparcos star catalog (mag <= 7.5) replaces the
   * bright-star catalog during rendering.
   */
  public readonly deepStarCatalogProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.showStarLabelsProperty = new BooleanProperty(zenithQueryParameters.showStarLabels, {
      ...(tandem && { tandem: tandem.createTandem("showStarLabelsProperty") }),
    });
    this.showConstellationsProperty = new BooleanProperty(zenithQueryParameters.showConstellations, {
      ...(tandem && { tandem: tandem.createTandem("showConstellationsProperty") }),
    });
    this.showPlanetLabelsProperty = new BooleanProperty(zenithQueryParameters.showPlanetLabels, {
      ...(tandem && { tandem: tandem.createTandem("showPlanetLabelsProperty") }),
    });
    this.deepStarCatalogProperty = new BooleanProperty(zenithQueryParameters.deepStarCatalog, {
      ...(tandem && { tandem: tandem.createTandem("deepStarCatalogProperty") }),
    });
  }

  // Deliberately no reset(): these overlay toggles are preference-backed and
  // outlive Reset All (see ZenithModel.reset). An unused reset() here would
  // invite wiring it into Reset All and silently breaking that contract.
}

ZenithNamespace.register("ZenithPreferencesModel", ZenithPreferencesModel);
