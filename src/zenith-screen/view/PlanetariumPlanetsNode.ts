/**
 * PlanetariumPlanetsNode.ts
 *
 * Draws Sun / Moon / planet discs (and optional name labels) in the FOV using
 * the same alt/az → screen projection as stars. Ephemeris from PlanetEphemeris;
 * colors/sizes from SolarSystemBodies + ZenithColors.
 *
 * Sun and Moon discs follow apparent angular diameter vs FOV above their
 * minimum visible pixel radii.
 * Planets use exaggerated magnitude-based radii unless true-scale is on.
 * The Moon disc includes an unlit terminator overlay from Illumination / MoonPhase.
 */

import { clamp } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { bodyNameProperty } from "../../common/bodyName.js";
import { discUnlitShape } from "../../common/sky/moonPhaseShape.js";
import {
  angularDiameterToRadiusPx,
  apparentAngularDiameterDeg,
  type PlanetBodyId,
} from "../../common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
import ZenithColors from "../../ZenithColors.js";
import { STAR_MAG_BRIGHT } from "../../ZenithConstants.js";
import { SOLAR_SYSTEM_BODIES, type SolarSystemBodyVisual } from "../model/SolarSystemBodies.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import type { SkyProjection } from "./SkyProjection.js";

const LABEL_FONT = new PhetFont(11);
const LABEL_OFFSET_X = 6;
const LABEL_OFFSET_Y = -4;
/** Magnitude treated as the faint end of planet disc scaling. */
const PLANET_MAG_FAINT = 8;

/**
 * Bodies whose illuminated phase is worth drawing — those interior to or near
 * Earth's orbit show an appreciable crescent/gibbous. Outer planets stay
 * effectively full, so they get no terminator overlay.
 */
const PHASE_BODY_IDS: ReadonlySet<PlanetBodyId> = new Set(["moon", "mercury", "venus", "mars"]);

/**
 * In true-scale mode, planet discs are drawn this many times their real angular
 * size. Kept small so a planet still reads as a star-like point at wide field
 * and only resolves into a disc (with phase) as you zoom in — mimicking a
 * telescope, since star glyphs are a fixed pixel size and never grow with zoom.
 * Sun and Moon are already large and are never exaggerated.
 */
const PLANET_TRUE_SCALE_EXAGGERATION = 8;

/** Cap on an exaggerated planet disc radius (px) so a near Jupiter stays sane. */
const PLANET_MAX_TRUE_SCALE_RADIUS_PX = 48;

const BODY_COLOR: Record<PlanetBodyId, typeof ZenithColors.sunColorProperty> = {
  sun: ZenithColors.sunColorProperty,
  moon: ZenithColors.moonColorProperty,
  mercury: ZenithColors.mercuryColorProperty,
  venus: ZenithColors.venusColorProperty,
  mars: ZenithColors.marsColorProperty,
  jupiter: ZenithColors.jupiterColorProperty,
  saturn: ZenithColors.saturnColorProperty,
  uranus: ZenithColors.uranusColorProperty,
  neptune: ZenithColors.neptuneColorProperty,
};

type BodyNodes = {
  visual: SolarSystemBodyVisual;
  /** Parent translated to the projected disc center. */
  discRoot: Node;
  disc: Circle;
  /** Unlit terminator overlay for phased bodies ({@link PHASE_BODY_IDS}); null otherwise. */
  phaseShadow: Path | null;
  label: Text;
};

export class PlanetariumPlanetsNode extends Node {
  private readonly model: ZenithModel;
  private readonly bodyNodes: BodyNodes[];

  public constructor(model: ZenithModel) {
    super({ pickable: false });

    this.model = model;

    this.bodyNodes = SOLAR_SYSTEM_BODIES.map((visual) => {
      const disc = new Circle(visual.minDiscRadiusPx, {
        fill: BODY_COLOR[visual.id],
        stroke: ZenithColors.horizonColorProperty,
        lineWidth: 1,
      });
      const phaseShadow = PHASE_BODY_IDS.has(visual.id)
        ? new Path(new Shape(), {
            fill: ZenithColors.moonShadowColorProperty,
            pickable: false,
          })
        : null;
      const discRoot = new Node({
        children: phaseShadow ? [disc, phaseShadow] : [disc],
        visible: false,
      });
      const label = new Text(bodyNameProperty(visual.id), {
        font: LABEL_FONT,
        fill: ZenithColors.planetLabelColorProperty,
        visible: false,
        pickable: false,
      });
      return { visual, discRoot, disc, phaseShadow, label };
    });

    this.children = this.bodyNodes.flatMap(({ discRoot, label }) => [discRoot, label]);
  }

  /**
   * Screen radius (px) for a body at the current true-scale setting. Sun and
   * Moon follow angular size above their visibility floors; planets are angular only when true-scale is
   * enabled. The stereographic scale varies with altitude, so angular sizing
   * uses the local degrees-per-pixel at the body's altitude.
   */
  public discRadiusPx(
    visual: SolarSystemBodyVisual,
    mag: number,
    distAu: number,
    projection: SkyProjection,
    altDeg: number,
    azDeg: number,
  ): number {
    const isSunOrMoon = visual.id === "sun" || visual.id === "moon";
    const useAngular = isSunOrMoon || this.model.trueScaleBodiesProperty.value;
    if (useAngular) {
      const diameterDeg = apparentAngularDiameterDeg(visual.radiusKm, distAu);
      // Exaggerate only the planets so their distance-driven size change (and
      // phase) reads without extreme zoom; the Sun and Moon keep only a visibility floor.
      const exaggeration = isSunOrMoon ? 1 : PLANET_TRUE_SCALE_EXAGGERATION;
      const radius = angularDiameterToRadiusPx(
        diameterDeg * exaggeration,
        projection.degreesPerPixelAt(altDeg, azDeg),
        visual.minDiscRadiusPx,
      );
      return isSunOrMoon ? radius : Math.min(radius, PLANET_MAX_TRUE_SCALE_RADIUS_PX);
    }
    const t = clamp((mag - STAR_MAG_BRIGHT) / (PLANET_MAG_FAINT - STAR_MAG_BRIGHT), 0, 1);
    return visual.maxDiscRadiusPx + (visual.minDiscRadiusPx - visual.maxDiscRadiusPx) * t;
  }

  /** Recompute disc positions from the current model / ephemeris state. */
  public redraw(projection: SkyProjection): void {
    const showPlanets = this.model.showPlanetsProperty.value;
    this.visible = showPlanets;
    if (!showPlanets) {
      return;
    }

    const showLabels = this.model.showPlanetLabelsProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;

    const snapshot = this.model.skySnapshotProperty.value;
    const phase = snapshot.moonPhase;

    const trueScale = this.model.trueScaleBodiesProperty.value;

    for (const { visual, discRoot, disc, phaseShadow, label } of this.bodyNodes) {
      const state = snapshot.byId.get(visual.id);
      if (!state) {
        discRoot.visible = false;
        label.visible = false;
        continue;
      }

      const { altDeg, azDeg } = equatorialToHorizontal(state.raHours, state.decDeg, lat, lst);

      if (hideBelowHorizon && altDeg < 0) {
        discRoot.visible = false;
        label.visible = false;
        continue;
      }

      const point = projection.project(altDeg, azDeg);
      if (!point) {
        discRoot.visible = false;
        label.visible = false;
        continue;
      }

      const radius = this.discRadiusPx(visual, state.mag, state.distAu, projection, altDeg, azDeg);
      disc.radius = radius;
      disc.centerX = 0;
      disc.centerY = 0;
      discRoot.translation = point;
      discRoot.visible = true;

      if (phaseShadow) {
        if (visual.id === "moon") {
          // The Moon's phase shows even when its disc is enlarged to the visibility floor.
          phaseShadow.shape = discUnlitShape(radius, phase.phaseFraction, phase.waxing);
          phaseShadow.visible = phase.phaseFraction < 1 - 1e-4;
        } else {
          // Planet phases only read on the exaggerated true-scale discs.
          const showPhase = trueScale && state.phaseFraction < 1 - 1e-4;
          if (showPhase) {
            phaseShadow.shape = discUnlitShape(radius, state.phaseFraction, state.litOnRight);
          }
          phaseShadow.visible = showPhase;
        }
      }

      if (showLabels && visual.preferLabel) {
        label.left = point.x + radius + LABEL_OFFSET_X;
        label.centerY = point.y + LABEL_OFFSET_Y;
        label.visible = true;
      } else {
        label.visible = false;
      }
    }
  }
}
