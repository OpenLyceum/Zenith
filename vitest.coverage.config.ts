/**
 * Vitest config for `npm run test:coverage`. Sim-specific (not template-owned).
 *
 * Kept apart from vitest.config.ts so the unit-test config stays identical to the
 * fleet template. Excludes generated star/shore catalogs from the coverage report.
 */

import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config.js";

const merged = mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        reportsDirectory: "./coverage",
        include: ["src/**"],
        exclude: [
          "src/zenith-screen/view/EarthShoreData.ts", // generated, 210 KB
          "src/zenith-screen/model/BrightStarCatalog.ts", // generated
          "src/zenith-screen/model/DeepStarCatalog.ts", // generated
          "src/zenith-screen/model/ConstellationLines.ts", // generated
        ],
      },
    },
  }),
);

export default merged;
