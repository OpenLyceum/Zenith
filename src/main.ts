/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "./i18n/StringManager.js";
import { ZenithPreferencesModel } from "./preferences/ZenithPreferencesModel.js";
import { ZenithPreferencesNode } from "./preferences/ZenithPreferencesNode.js";
import ZenithColors from "./ZenithColors.js";
import { ZenithScreen } from "./zenith-screen/ZenithScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from zenithQueryParameters.
  const simPreferences = new ZenithPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new ZenithScreen({
      preferences: simPreferences,
      // The screen name Property updates automatically when the locale changes
      name: stringManager.getScreenNames().planetariumStringProperty,
      tandem: Tandem.ROOT.createTandem("planetariumScreen"),
      backgroundColorProperty: ZenithColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new ZenithPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // `credits` is deliberately omitted: joist renders a row for every key it is
    // given, so empty strings produce blank labelled rows in Help → About. Add
    // the keys back only with real names. Project attribution lives in CREDITS.md.
  });

  sim.start();
});
