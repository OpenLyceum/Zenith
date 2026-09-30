/**
 * CelestialLinesNode.ts
 *
 * Optional teaching overlays projected with the same alt/az → screen mapping as
 * the stars:
 *   - the ecliptic (the Sun's yearly path around the sky),
 *   - the celestial equator (declination 0°), and
 *   - the diurnal path of the currently selected object (the circle it traces as
 *     Earth rotates, at its present declination).
 *
 * Each is a great/small circle sampled in equatorial coordinates, transformed to
 * the horizon frame, and drawn as a polyline that breaks where it leaves the FOV
 * or (optionally) drops below the horizon.
 */

import { DerivedProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed, type Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { eclipticEquatorPoints } from "../../common/sky/EclipticCoordinates.js";
import { type EquatorialCoordinates, equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
import { StringManager } from "../../i18n/StringManager.js";
import ZenithColors from "../../ZenithColors.js";
import { CELESTIAL_LINE_SAMPLE_STEP_DEG, OBJECT_PATH_SAMPLE_STEP_DEG } from "../../ZenithConstants.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import type { SkyProjection } from "./SkyProjection.js";

const MEASURE_LABEL_FONT = new PhetFont({ size: 12, weight: "bold" });
const MEASURE_ENDPOINT_RADIUS_PX = 4;

/** Celestial equator samples (Dec 0°) around the full circle of right ascension. */
const CELESTIAL_EQUATOR_POINTS: EquatorialCoordinates[] = [];
for (let raStep = 0; raStep <= 360; raStep += CELESTIAL_LINE_SAMPLE_STEP_DEG) {
  CELESTIAL_EQUATOR_POINTS.push({ raHours: (raStep / 360) * 24, decDeg: 0 });
}

const ECLIPTIC_POINTS = eclipticEquatorPoints(CELESTIAL_LINE_SAMPLE_STEP_DEG);

export class CelestialLinesNode extends Node {
  private readonly model: ZenithModel;
  private readonly eclipticPath: Path;
  private readonly equatorPath: Path;
  private readonly objectPath: Path;
  private readonly measureLine: Path;
  private readonly measureEndpointA: Circle;
  private readonly measureEndpointB: Circle;
  private readonly measureLabel: Text;
  /**
   * Derived Properties backing {@link measureLabel}. Held so {@link dispose} can
   * tear them down: `Node.dispose()` only detaches children, so the label Text's
   * string source (a `PatternStringProperty` over `separationText`, which in turn
   * listens to `model.measureSeparationDegProperty`) would otherwise keep the
   * model and the localized measure string subscribed after the node is gone.
   */
  private readonly separationText: TReadOnlyProperty<string>;
  private readonly measureSeparationPattern: TReadOnlyProperty<string>;

  public constructor(model: ZenithModel) {
    super({ pickable: false });
    this.model = model;

    this.eclipticPath = new Path(null, {
      stroke: ZenithColors.eclipticColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 4],
      opacity: 0.85,
      pickable: false,
    });
    this.equatorPath = new Path(null, {
      stroke: ZenithColors.celestialEquatorColorProperty,
      lineWidth: 1.5,
      opacity: 0.8,
      pickable: false,
    });
    this.objectPath = new Path(null, {
      stroke: ZenithColors.objectPathColorProperty,
      lineWidth: 1.5,
      lineDash: [3, 3],
      opacity: 0.9,
      pickable: false,
    });

    const measureColor = ZenithColors.selectionColorProperty;
    this.measureLine = new Path(null, { stroke: measureColor, lineWidth: 2, pickable: false });
    this.measureEndpointA = new Circle(MEASURE_ENDPOINT_RADIUS_PX, {
      fill: measureColor,
      visible: false,
      pickable: false,
    });
    this.measureEndpointB = new Circle(MEASURE_ENDPOINT_RADIUS_PX, {
      fill: measureColor,
      visible: false,
      pickable: false,
    });
    this.separationText = new DerivedProperty([model.measureSeparationDegProperty], (deg) =>
      deg === null ? "" : toFixed(deg, 1),
    );
    this.measureSeparationPattern = new PatternStringProperty(
      StringManager.getInstance().getControls().measureSeparationStringProperty,
      { deg: this.separationText },
    );
    this.measureLabel = new Text(this.measureSeparationPattern, {
      font: MEASURE_LABEL_FONT,
      fill: measureColor,
      visible: false,
      pickable: false,
    });

    this.children = [
      this.equatorPath,
      this.eclipticPath,
      this.objectPath,
      this.measureLine,
      this.measureEndpointA,
      this.measureEndpointB,
      this.measureLabel,
    ];
  }

  /**
   * Disposes the measure label and its backing derived Properties before the
   * base `Node.dispose()` detaches the remaining children. The label Text is
   * disposed first so it stops forwarding to `measureSeparationPattern`; that
   * pattern is then free of listeners and safe to dispose, and finally
   * `separationText` (its sole remaining dependency) is released — dropping the
   * subscription on `model.measureSeparationDegProperty`. Idempotent via the
   * base class's disposed guard.
   */
  public override dispose(): void {
    this.measureLabel.dispose();
    this.measureSeparationPattern.dispose();
    this.separationText.dispose();
    super.dispose();
  }

  /** Projects a sequence of equatorial samples to a broken polyline shape. */
  private greatCircleShape(samples: readonly EquatorialCoordinates[], projection: SkyProjection): Shape {
    const shape = new Shape();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    let started = false;
    let previous: Vector2 | null = null;
    for (const sample of samples) {
      const { altDeg, azDeg } = equatorialToHorizontal(sample.raHours, sample.decDeg, lat, lst);
      const point = hideBelowHorizon && altDeg < 0 ? null : projection.project(altDeg, azDeg);
      if (!point) {
        started = false;
        previous = null;
        continue;
      }
      // Break the line when consecutive samples jump implausibly far on screen
      // (e.g. skimming the zenith or leaving/re-entering the disc).
      if (started && previous && point.distance(previous) > projection.bounds.width / 2) {
        started = false;
      }
      if (!started) {
        shape.moveTo(point.x, point.y);
        started = true;
      } else {
        shape.lineTo(point.x, point.y);
      }
      previous = point;
    }
    return shape;
  }

  /** Recompute the enabled overlays from the current projection / model state. */
  public redraw(projection: SkyProjection): void {
    this.equatorPath.visible = this.model.showCelestialEquatorProperty.value;
    this.equatorPath.shape = this.equatorPath.visible
      ? this.greatCircleShape(CELESTIAL_EQUATOR_POINTS, projection)
      : null;

    this.eclipticPath.visible = this.model.showEclipticProperty.value;
    this.eclipticPath.shape = this.eclipticPath.visible ? this.greatCircleShape(ECLIPTIC_POINTS, projection) : null;

    const showObjectPath = this.model.showObjectPathProperty.value && this.model.selectedObjectProperty.value !== null;
    this.objectPath.visible = showObjectPath;
    this.objectPath.shape = showObjectPath ? this.diurnalPathShape(projection) : null;

    this.redrawMeasurement(projection);
  }

  /** Projects an equatorial endpoint to a pixel (null if off-FOV). */
  private projectEquatorial(eq: EquatorialCoordinates | null, projection: SkyProjection): Vector2 | null {
    if (!eq) {
      return null;
    }
    const { altDeg, azDeg } = equatorialToHorizontal(
      eq.raHours,
      eq.decDeg,
      this.model.latitudeProperty.value,
      this.model.localSiderealTimeHoursProperty.value,
    );
    return projection.project(altDeg, azDeg);
  }

  /** Draws the angular-distance line, endpoints, and the separation label. */
  private redrawMeasurement(projection: SkyProjection): void {
    const a = this.projectEquatorial(this.model.measureStartProperty.value, projection);
    const b = this.projectEquatorial(this.model.measureEndProperty.value, projection);

    this.measureEndpointA.visible = a !== null;
    if (a) {
      this.measureEndpointA.center = a;
    }
    this.measureEndpointB.visible = b !== null;
    if (b) {
      this.measureEndpointB.center = b;
    }

    if (a && b) {
      this.measureLine.shape = Shape.lineSegment(a.x, a.y, b.x, b.y);
      this.measureLine.visible = true;
      this.measureLabel.centerX = (a.x + b.x) / 2;
      this.measureLabel.centerY = (a.y + b.y) / 2 - 10;
      this.measureLabel.visible = true;
    } else {
      this.measureLine.visible = false;
      this.measureLabel.visible = false;
    }
  }

  /** The selected object's full diurnal circle, sampled by hour angle. */
  private diurnalPathShape(projection: SkyProjection): Shape {
    const selected = this.model.selectedObjectProperty.value;
    const eq = selected ? this.model.equatorialOfSelected(selected) : null;
    if (!eq) {
      return new Shape();
    }
    const lat = this.model.latitudeProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    const shape = new Shape();
    let started = false;
    let previous: Vector2 | null = null;
    for (let deg = 0; deg <= 360; deg += OBJECT_PATH_SAMPLE_STEP_DEG) {
      // Vary LST so hour angle sweeps the whole circle at the object's fixed declination.
      const lst = eq.raHours + deg / 15;
      const { altDeg, azDeg } = equatorialToHorizontal(eq.raHours, eq.decDeg, lat, lst);
      const point = hideBelowHorizon && altDeg < 0 ? null : projection.project(altDeg, azDeg);
      if (!point) {
        started = false;
        previous = null;
        continue;
      }
      if (started && previous && point.distance(previous) > projection.bounds.width / 2) {
        started = false;
      }
      if (!started) {
        shape.moveTo(point.x, point.y);
        started = true;
      } else {
        shape.lineTo(point.x, point.y);
      }
      previous = point;
    }
    return shape;
  }
}
