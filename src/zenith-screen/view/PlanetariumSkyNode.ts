/**
 * PlanetariumSkyNode.ts
 *
 * Aim-able first-person sky view for an Earth observer, drawn with a
 * stereographic (fisheye) projection (see {@link SkyProjection}). Stars from the
 * bright-star catalog are projected via equatorial → horizontal → screen pixels.
 * Because it is a true spherical projection, the horizon appears as a curve and
 * the altitude/azimuth grid converges to a point at the zenith as the camera
 * tilts up. Look direction and FOV are continuous Properties on ZenithModel.
 * Optional overlays include an alt/az grid with tick labels, meridian, cardinals,
 * and an RA/Dec grid with hour/declination tick labels.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { type Bounds2, clamp, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, LinearGradient, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { type PrecessionMatrix, rotateEquatorial } from "../../common/sky/Precession.js";
import {
  type EquatorialCoordinates,
  equatorialToHorizontal,
  equatorialToHorizonVector,
  horizontalToEquatorial,
} from "../../common/sky/SkyCoordinates.js";
import { ASTRONOMICAL_TWILIGHT_DEG, effectiveStarVisibility, twilightSkyColors } from "../../common/sky/SkyTwilight.js";
import { StringManager } from "../../i18n/StringManager.js";
import ZenithColors from "../../ZenithColors.js";
import {
  ALT_AZ_GRID_ALT_MAX_DEG,
  ALT_AZ_GRID_ALT_STEP_DEG,
  ALT_AZ_GRID_AZ_STEP_DEG,
  CARDINAL_LABEL_ALTITUDE_DEG,
  EQUATORIAL_GRID_DEC_MAX_DEG,
  EQUATORIAL_GRID_DEC_MIN_DEG,
  EQUATORIAL_GRID_DEC_STEP_DEG,
  EQUATORIAL_GRID_PARALLEL_DEC_MAX_DEG,
  EQUATORIAL_GRID_PARALLEL_DEC_MIN_DEG,
  EQUATORIAL_GRID_RA_STEP_HOURS,
  SELECTION_HIT_RADIUS_PX,
  STAR_MAG_BRIGHT,
  STAR_RADIUS_MAX,
  STAR_RADIUS_MIN,
} from "../../ZenithConstants.js";
import {
  BRIGHT_STAR_COUNT,
  BRIGHT_STAR_DEC_DEG,
  BRIGHT_STAR_MAG,
  BRIGHT_STAR_RA_HOURS,
} from "../model/BrightStarCatalog.js";
import { CONSTELLATION_FIGURES, type ConstellationId, constellationStarById } from "../model/ConstellationLines.js";
import { getDeepStarData } from "../model/DeepStarCatalog.js";
import { NAMED_BRIGHT_STARS, namedStarById } from "../model/NamedBrightStars.js";
import type { SelectedSkyObject } from "../model/SelectedSkyObject.js";
import { solarSystemBodyVisual } from "../model/SolarSystemBodies.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import { CelestialLinesNode } from "./CelestialLinesNode.js";
import { PlanetariumPlanetsNode } from "./PlanetariumPlanetsNode.js";
import { SkyProjection } from "./SkyProjection.js";
import { horizonAndGroundShapes } from "./sky-horizon.js";
import {
  bestEquatorialLabelPointForDec,
  bestEquatorialLabelPointForRa,
  placeAltitudeLabel,
  placeAzimuthLabel,
} from "./sky-labels.js";

const LABEL_FONT = new PhetFont(11);
const GRID_LABEL_FONT = new PhetFont({ size: 11, weight: "bold" });
const CONSTELLATION_LABEL_FONT = new PhetFont({ size: 13, weight: "bold" });
const CARDINAL_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_OFFSET_X = 6;
const LABEL_OFFSET_Y = -4;
const MERIDIAN_ALT_STEP_DEG = 5;
const EQUATORIAL_SAMPLE_STEP_DEG = 5;
/** Step size (degrees) for azimuth sweeps in the alt/az grid and meridian shapes. */
const AZIMUTH_SWEEP_STEP_DEG = 2;
/** Break a polyline when consecutive samples jump more than this fraction of the view. */
const LINE_BREAK_FRACTION = 0.5;
/** Extra radius (px) so the selection ring sits just outside the object disc. */
const SELECTION_RING_PADDING_PX = 4;
/** Altitude (degrees) at which the zenith marker is drawn. */
const ZENITH_MARKER_ALTITUDE_DEG = 90;
/** Stars dimmer than this effective visibility are not click/keyboard selectable. */
const STAR_SELECTABLE_MIN_VISIBILITY = 0.05;
/** Constellation name labels appear only above this effective star visibility. */
const CONSTELLATION_LABEL_MIN_VISIBILITY = 0.15;
/** Below this effective star visibility, stars and constellation lines are not drawn. */
const STAR_RENDER_MIN_VISIBILITY = 0.02;

const formatRaTickLabel = (raHours: number): string => `${raHours}h`;

const formatDecTickLabel = (decDeg: number): string => {
  if (decDeg > 0) {
    return `+${decDeg}°`;
  }
  if (decDeg < 0) {
    return `−${Math.abs(decDeg)}°`;
  }
  return "0°";
};

const formatAltAzTickLabel = (deg: number): string => `${deg}°`;

export type PlanetariumSkyNodeOptions = {
  bounds: Bounds2;
};

type StarLabelNode = {
  starId: string;
  label: Text;
};

type ConstellationLabelNode = {
  /** Unique anchor-star ids for the figure, precomputed for the label centroid. */
  starIds: readonly string[];
  label: Text;
};

type EquatorialTickLabelNode = {
  kind: "ra" | "dec";
  value: number;
  label: Text;
};

type HorizontalTickLabelNode = {
  kind: "alt" | "az";
  value: number;
  label: Text;
};

export class PlanetariumSkyNode extends Node {
  private readonly model: ZenithModel;
  private bounds2: Bounds2;
  private projection: SkyProjection;

  /** Full-bounds sky background (zenith→horizon vertical gradient). */
  private readonly skyFill: Rectangle;
  /** Ground fill below the (curved) horizon. */
  private readonly groundFill: Path;
  /** Horizon curve (alt 0°) stroked across the view. */
  private readonly horizonLine: Path;
  private readonly equatorialGridPath: Path;
  private readonly equatorialLabelsLayer: Node;
  private readonly equatorialTickLabels: EquatorialTickLabelNode[];
  private readonly constellationPath: Path;
  private readonly constellationLabelsLayer: Node;
  private readonly constellationLabelNodes: ConstellationLabelNode[];
  private readonly gridPath: Path;
  private readonly horizontalLabelsLayer: Node;
  private readonly horizontalTickLabels: HorizontalTickLabelNode[];
  private readonly meridianPath: Path;
  private readonly celestialLinesNode: CelestialLinesNode;
  private readonly starsPath: Path;
  private readonly planetsNode: PlanetariumPlanetsNode;
  private readonly starLabelsLayer: Node;
  private readonly starLabelNodes: StarLabelNode[];
  private readonly cardinalLabels: {
    north: Text;
    south: Text;
    east: Text;
    west: Text;
    northeast: Text;
    southeast: Text;
    southwest: Text;
    northwest: Text;
    zenith: Text;
  };
  private readonly selectionRing: Circle;
  private readonly hoverLabel: Text;

  /**
   * Set when a redraw dependency changes; cleared by {@link updateDirty}. Lets a
   * single frame coalesce many dependency changes into one redraw (see the
   * dependency wiring below).
   */
  private skyDirty = false;

  /**
   * Set when something that moves the fixed alt/az frame changes — look
   * direction, field of view, view bounds, or a frame-layer toggle. The alt/az
   * grid, meridian, cardinal labels, and horizon/ground shapes are anchored to
   * the observer, not the stars, so while time plays they are rebuilt only when
   * this is set rather than on every frame. Starts true for the first redraw.
   */
  private frameDirty = true;

  /**
   * Teardown functions for the lazyLinks wired in the constructor. Held so
   * {@link dispose} can detach them; otherwise the linked model Properties would
   * keep firing `skyDirty = true` into a node that's no longer in the scene.
   */
  private readonly disposers: (() => void)[] = [];

  public constructor(model: ZenithModel, options: PlanetariumSkyNodeOptions) {
    super({ pickable: true });

    this.model = model;
    this.bounds2 = options.bounds;

    this.skyFill = new Rectangle(0, 0, 1, 1, {
      fill: ZenithColors.skyPanelColorProperty.value,
    });
    this.groundFill = new Path(null, { fill: ZenithColors.groundColorProperty.value });
    this.horizonLine = new Path(null, {
      stroke: ZenithColors.horizonColorProperty,
      lineWidth: 2,
    });
    this.equatorialGridPath = new Path(null, {
      stroke: ZenithColors.equatorialGridColorProperty,
      lineWidth: 1,
      opacity: 0.45,
      pickable: false,
    });

    const equatorialTickLabels: EquatorialTickLabelNode[] = [];
    for (let ra = 0; ra < 24; ra += EQUATORIAL_GRID_RA_STEP_HOURS) {
      equatorialTickLabels.push({
        kind: "ra",
        value: ra,
        label: new Text(formatRaTickLabel(ra), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.equatorialGridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    for (
      let dec = EQUATORIAL_GRID_PARALLEL_DEC_MIN_DEG;
      dec <= EQUATORIAL_GRID_PARALLEL_DEC_MAX_DEG;
      dec += EQUATORIAL_GRID_DEC_STEP_DEG
    ) {
      equatorialTickLabels.push({
        kind: "dec",
        value: dec,
        label: new Text(formatDecTickLabel(dec), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.equatorialGridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    this.equatorialTickLabels = equatorialTickLabels;
    this.equatorialLabelsLayer = new Node({
      children: equatorialTickLabels.map((n) => n.label),
      pickable: false,
    });

    this.constellationPath = new Path(null, {
      stroke: ZenithColors.constellationColorProperty,
      lineWidth: 1.5,
      opacity: 0.85,
      pickable: false,
    });
    this.gridPath = new Path(null, {
      stroke: ZenithColors.gridColorProperty,
      lineWidth: 1,
      opacity: 0.55,
      pickable: false,
    });

    const horizontalTickLabels: HorizontalTickLabelNode[] = [];
    for (let alt = 0; alt <= ALT_AZ_GRID_ALT_MAX_DEG; alt += ALT_AZ_GRID_ALT_STEP_DEG) {
      horizontalTickLabels.push({
        kind: "alt",
        value: alt,
        label: new Text(formatAltAzTickLabel(alt), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.gridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    for (let az = 0; az < 360; az += ALT_AZ_GRID_AZ_STEP_DEG) {
      horizontalTickLabels.push({
        kind: "az",
        value: az,
        label: new Text(formatAltAzTickLabel(az), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.gridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    this.horizontalTickLabels = horizontalTickLabels;
    this.horizontalLabelsLayer = new Node({
      children: horizontalTickLabels.map((n) => n.label),
      pickable: false,
    });

    this.meridianPath = new Path(null, {
      stroke: ZenithColors.meridianColorProperty,
      lineWidth: 1.5,
      opacity: 0.75,
      pickable: false,
    });
    this.starsPath = new Path(null, {
      fill: ZenithColors.starColorProperty,
      pickable: false,
    });
    this.planetsNode = new PlanetariumPlanetsNode(model);
    this.celestialLinesNode = new CelestialLinesNode(model);

    const stars = StringManager.getInstance().getStars();
    const starNameProperty = (id: string): TReadOnlyProperty<string> => {
      const key = `${id}StringProperty` as keyof typeof stars;
      return stars[key] as TReadOnlyProperty<string>;
    };

    this.starLabelNodes = NAMED_BRIGHT_STARS.map((star) => ({
      starId: star.id,
      label: new Text(starNameProperty(star.id), {
        font: LABEL_FONT,
        fill: ZenithColors.starLabelColorProperty,
        visible: false,
        pickable: false,
      }),
    }));
    this.starLabelsLayer = new Node({
      children: this.starLabelNodes.map((n) => n.label),
      pickable: false,
    });

    const constellations = StringManager.getInstance().getConstellations();
    const constellationNameProperty = (id: ConstellationId): TReadOnlyProperty<string> => {
      const key = `${id}StringProperty` as keyof typeof constellations;
      return constellations[key] as TReadOnlyProperty<string>;
    };
    this.constellationLabelNodes = CONSTELLATION_FIGURES.map((figure) => ({
      starIds: [...new Set(figure.segments.flatMap((segment) => [segment.fromId, segment.toId]))],
      label: new Text(constellationNameProperty(figure.id), {
        font: CONSTELLATION_LABEL_FONT,
        fill: ZenithColors.constellationLabelColorProperty,
        visible: false,
        pickable: false,
        opacity: 0.9,
      }),
    }));
    this.constellationLabelsLayer = new Node({
      children: this.constellationLabelNodes.map((n) => n.label),
      pickable: false,
    });

    const cardinals = StringManager.getInstance().getCardinals();
    const cardinalText = (property: TReadOnlyProperty<string>): Text =>
      new Text(property, {
        font: CARDINAL_FONT,
        fill: ZenithColors.accentColorProperty,
        visible: false,
        pickable: false,
      });
    this.cardinalLabels = {
      north: cardinalText(cardinals.northStringProperty),
      south: cardinalText(cardinals.southStringProperty),
      east: cardinalText(cardinals.eastStringProperty),
      west: cardinalText(cardinals.westStringProperty),
      northeast: cardinalText(cardinals.northeastStringProperty),
      southeast: cardinalText(cardinals.southeastStringProperty),
      southwest: cardinalText(cardinals.southwestStringProperty),
      northwest: cardinalText(cardinals.northwestStringProperty),
      zenith: cardinalText(cardinals.zenithStringProperty),
    };
    // Cardinals are centered on their horizon point; a locale switch resizes the
    // text, so re-place them even though the alt/az frame itself hasn't moved.
    for (const label of Object.values(this.cardinalLabels)) {
      const onCardinalResize = (): void => {
        this.frameDirty = true;
        this.skyDirty = true;
      };
      label.localBoundsProperty.lazyLink(onCardinalResize);
      this.disposers.push(() => label.localBoundsProperty.unlink(onCardinalResize));
    }

    this.selectionRing = new Circle(10, {
      stroke: ZenithColors.selectionColorProperty,
      lineWidth: 2,
      visible: false,
      pickable: false,
    });

    this.hoverLabel = new Text("", {
      font: LABEL_FONT,
      fill: ZenithColors.accentColorProperty,
      visible: false,
      pickable: false,
    });

    this.children = [
      this.skyFill,
      this.constellationPath,
      this.constellationLabelsLayer,
      this.groundFill,
      this.horizonLine,
      this.equatorialGridPath,
      this.equatorialLabelsLayer,
      this.gridPath,
      this.horizontalLabelsLayer,
      this.meridianPath,
      this.celestialLinesNode,
      this.starsPath,
      this.planetsNode,
      this.starLabelsLayer,
      this.cardinalLabels.north,
      this.cardinalLabels.northeast,
      this.cardinalLabels.east,
      this.cardinalLabels.southeast,
      this.cardinalLabels.south,
      this.cardinalLabels.southwest,
      this.cardinalLabels.west,
      this.cardinalLabels.northwest,
      this.cardinalLabels.zenith,
      this.selectionRing,
      this.hoverLabel,
    ];

    const redrawDependencies = [
      model.latitudeProperty,
      model.longitudeProperty,
      model.civilTimeMsProperty,
      model.localSiderealTimeHoursProperty,
      model.solarAltitudeDegProperty,
      model.lookAzimuthDegProperty,
      model.lookAltitudeDegProperty,
      model.fieldOfViewDegProperty,
      model.showGridProperty,
      model.showCardinalsProperty,
      model.showMeridianProperty,
      model.showEquatorialGridProperty,
      model.showHorizonProperty,
      model.showAtmosphereProperty,
      model.showPlanetsProperty,
      model.trueScaleBodiesProperty,
      model.showPlanetLabelsProperty,
      model.showStarLabelsProperty,
      model.showConstellationsProperty,
      model.showEclipticProperty,
      model.showCelestialEquatorProperty,
      model.showObjectPathProperty,
      model.deepStarCatalogProperty,
      model.magnitudeLimitProperty,
      model.selectedObjectProperty,
      model.measureStartProperty,
      model.measureEndProperty,
      ZenithColors.skyPanelColorProperty,
      ZenithColors.skyNightHorizonColorProperty,
      ZenithColors.skyDayZenithColorProperty,
      ZenithColors.skyDayHorizonColorProperty,
      ZenithColors.skyTwilightHorizonColorProperty,
      ZenithColors.groundColorProperty,
      ZenithColors.groundDayColorProperty,
    ] as const;

    // Multilink is capped at 15 deps; wire redraw via individual lazyLinks. The
    // links only flag the view dirty — the redraw itself is coalesced to once per
    // frame in updateDirty(). One logical change often notifies several of these
    // in turn (e.g. advancing time sets civil time, then local sidereal time,
    // then re-derives solar altitude), which would otherwise force a full redraw
    // — grids, constellations, and every catalog star — several times per frame.
    // The subset that also moves the alt/az frame layers (see frameDirty).
    const frameDependencies: ReadonlySet<unknown> = new Set([
      model.lookAzimuthDegProperty,
      model.lookAltitudeDegProperty,
      model.fieldOfViewDegProperty,
      model.showGridProperty,
      model.showCardinalsProperty,
      model.showMeridianProperty,
      model.showHorizonProperty,
    ]);
    for (const property of redrawDependencies) {
      const movesFrame = frameDependencies.has(property);
      const listener = (): void => {
        this.skyDirty = true;
        if (movesFrame) {
          this.frameDirty = true;
        }
      };
      property.lazyLink(listener);
      this.disposers.push(() => property.unlink(listener));
    }

    this.clipArea = Shape.bounds(this.bounds2);
    this.projection = this.buildProjection();
    this.redraw();
  }

  /**
   * Redraws the sky once if any dependency changed since the last call. Driven
   * once per frame from the screen view's step, so a frame does at most one
   * redraw no matter how many dependencies changed within it.
   */
  public updateDirty(): void {
    if (this.skyDirty) {
      this.skyDirty = false;
      this.redraw();
    }
  }

  /**
   * Detaches the redraw-dependency and cardinal-resize lazyLinks, then tears down the child
   * subtree. `Node.dispose()` only *detaches* children (removeAllChildren) — it
   * does not dispose them — so the label Text nodes (cardinals, star/planet
   * names) and `celestialLinesNode`'s derived measure Properties would otherwise
   * stay subscribed to the shared StringManager / model Properties after this
   * node is gone. Disposing each child tree (the same walk as `disposeSubtree`,
   * but without re-entering this override) releases those subscriptions.
   * Idempotent — after the first pass there are no children and no disposers
   * left. Always called by {@link ZenithScreenView.dispose} during teardown.
   */
  public override dispose(): void {
    for (const dispose of this.disposers.splice(0)) {
      dispose();
    }
    const children = this.children;
    super.dispose();
    for (const child of children) {
      child.disposeSubtree();
    }
  }

  /** Repositions the panel after layout changes. */
  public setViewBounds(bounds: Bounds2): void {
    this.bounds2 = bounds;
    // Clip the fisheye overdraw (points beyond the FOV can project far outside).
    this.clipArea = Shape.bounds(bounds);
    // Redraw immediately (layout changes are rare) and drop any pending dirty flag.
    this.skyDirty = false;
    this.frameDirty = true;
    this.redraw();
  }

  public getViewBounds(): Bounds2 {
    return this.bounds2;
  }

  /**
   * Finds the nearest named star or planet to a view-coordinate click, within
   * {@link SELECTION_HIT_RADIUS_PX}. Returns null if nothing is close enough.
   */
  public findNearestObject(viewPoint: Vector2): SelectedSkyObject | null {
    let best: SelectedSkyObject | null = null;
    let bestDistSq = SELECTION_HIT_RADIUS_PX * SELECTION_HIT_RADIUS_PX;

    for (const object of this.listSelectableObjectsInView()) {
      const point = this.projectSelectedObject(object);
      if (!point) {
        continue;
      }
      const distSq = point.distanceSquared(viewPoint);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = object;
      }
    }

    return best;
  }

  /**
   * Named stars and planets currently projectable in the FOV, in a stable order
   * for keyboard N/P cycling (west→east, then low→high). Stars fade out of the
   * selectable set when the Sun washes them out.
   */
  public listSelectableObjectsInView(): SelectedSkyObject[] {
    // `this.projection` is rebuilt once per frame in redraw() and an initial
    // redraw runs in the constructor, so it is always current when interaction
    // handlers fire — no need to rebuild it here on every selection cycle.
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const magLimit = this.model.magnitudeLimitProperty.value;
    const starVisibility = effectiveStarVisibility(
      this.model.solarAltitudeDegProperty.value,
      this.model.showAtmosphereProperty.value,
    );

    type Ranked = { object: SelectedSkyObject; x: number; y: number };
    const ranked: Ranked[] = [];

    const pushIfVisible = (object: SelectedSkyObject, altDeg: number, azDeg: number): void => {
      if (hideBelowHorizon && altDeg < 0) {
        return;
      }
      const point = this.projectAltAz(altDeg, azDeg);
      if (!(point && this.bounds2.containsPoint(point))) {
        return;
      }
      ranked.push({ object, x: point.x, y: point.y });
    };

    if (starVisibility >= STAR_SELECTABLE_MIN_VISIBILITY) {
      for (const star of NAMED_BRIGHT_STARS) {
        if (star.mag > magLimit) {
          continue;
        }
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raHours,
          star.decDeg,
          lat,
          lst,
          this.model.precessionMatrix,
        );
        pushIfVisible(
          {
            kind: "star",
            id: star.id,
            raHours: star.raHours,
            decDeg: star.decDeg,
            mag: star.mag,
          },
          altDeg,
          azDeg,
        );
      }
    }

    if (this.model.showPlanetsProperty.value) {
      for (const entry of this.model.skySnapshotProperty.value.bodies) {
        const { altDeg, azDeg } = equatorialToHorizontal(entry.state.raHours, entry.state.decDeg, lat, lst);
        pushIfVisible({ kind: "planet", id: entry.bodyId }, altDeg, azDeg);
      }
    }

    ranked.sort((a, b) => a.x - b.x || b.y - a.y);
    return ranked.map((entry) => entry.object);
  }

  /**
   * Equatorial coordinates for a view-space click: snaps to the nearest
   * selectable object when one is close, otherwise inverse-projects the empty
   * sky point. Used by the angular-distance measure tool.
   */
  public equatorialAtViewPoint(viewPoint: Vector2): EquatorialCoordinates {
    const nearest = this.findNearestObject(viewPoint);
    if (nearest) {
      const eq = this.model.equatorialOfSelected(nearest);
      if (eq) {
        return rotateEquatorial(eq.raHours, eq.decDeg, this.model.precessionMatrix, true);
      }
    }
    const { altDeg, azDeg } = this.projection.unproject(viewPoint);
    const ofDate = horizontalToEquatorial(
      altDeg,
      azDeg,
      this.model.latitudeProperty.value,
      this.model.localSiderealTimeHoursProperty.value,
    );
    return rotateEquatorial(ofDate.raHours, ofDate.decDeg, this.model.precessionMatrix, true);
  }

  /** Localized display name for a hovered/selected object. */
  private objectDisplayName(selected: SelectedSkyObject): string {
    if (selected.kind === "star") {
      const stars = StringManager.getInstance().getStars();
      const key = `${selected.id}StringProperty` as keyof typeof stars;
      return (stars[key] as TReadOnlyProperty<string>).value;
    }
    const bodies = StringManager.getInstance().getBodies();
    const key = `${selected.id}StringProperty` as keyof typeof bodies;
    return (bodies[key] as TReadOnlyProperty<string>).value;
  }

  /**
   * Shows a floating name label for the nearest object under the pointer, or
   * hides it when the pointer is over empty sky or has left the view.
   */
  public updateHover(viewPoint: Vector2 | null): void {
    const nearest = viewPoint ? this.findNearestObject(viewPoint) : null;
    if (!(nearest && viewPoint)) {
      this.hoverLabel.visible = false;
      return;
    }
    this.hoverLabel.string = this.objectDisplayName(nearest);
    this.hoverLabel.leftBottom = new Vector2(viewPoint.x + 12, viewPoint.y - 8);
    this.hoverLabel.visible = true;
  }

  private projectSelectedObject(selected: SelectedSkyObject): Vector2 | null {
    const eq = this.model.equatorialOfSelected(selected);
    if (!eq) {
      return null;
    }
    const { altDeg, azDeg } = equatorialToHorizontal(
      eq.raHours,
      eq.decDeg,
      this.model.latitudeProperty.value,
      this.model.localSiderealTimeHoursProperty.value,
    );
    return this.projectAltAz(altDeg, azDeg);
  }

  /** Builds a projection value object from the current look / FOV / bounds. */
  private buildProjection(): SkyProjection {
    return new SkyProjection({
      bounds: this.bounds2,
      lookAzimuthDeg: this.model.lookAzimuthDegProperty.value,
      lookAltitudeDeg: this.model.lookAltitudeDegProperty.value,
      fieldOfViewDeg: this.model.fieldOfViewDegProperty.value,
    });
  }

  private projectAltAz(altDeg: number, azDeg: number): Vector2 | null {
    return this.projection.project(altDeg, azDeg);
  }

  private starRadius(mag: number): number {
    const t = clamp((mag - STAR_MAG_BRIGHT) / (this.model.magnitudeLimitProperty.value - STAR_MAG_BRIGHT), 0, 1);
    return STAR_RADIUS_MAX + (STAR_RADIUS_MIN - STAR_RADIUS_MAX) * t;
  }

  /**
   * Appends a broken polyline to `shape`, sampling `steps + 1` points and
   * starting a new sub-path whenever a sample is culled or jumps implausibly far
   * on screen (a great circle skimming the antipode).
   */
  private appendSampledCurve(shape: Shape, steps: number, sample: (i: number) => Vector2 | null): void {
    const breakPx = LINE_BREAK_FRACTION * Math.min(this.bounds2.width, this.bounds2.height);
    let started = false;
    let previous: Vector2 | null = null;
    for (let i = 0; i <= steps; i++) {
      const point = sample(i);
      if (!point) {
        started = false;
        previous = null;
        continue;
      }
      if (started && previous && point.distance(previous) > breakPx) {
        started = false;
      }
      if (started) {
        shape.lineTo(point.x, point.y);
      } else {
        shape.moveTo(point.x, point.y);
        started = true;
      }
      previous = point;
    }
  }

  private altAzGridShape(): Shape {
    const shape = new Shape();
    const azSteps = Math.round(360 / AZIMUTH_SWEEP_STEP_DEG);
    // With the horizon (ground) hidden the lower hemisphere is in view, so sweep
    // the grid down below alt 0 as well to keep that region populated; otherwise
    // the grid stops at the horizon where the ground takes over.
    const altMin = this.model.showHorizonProperty.value ? 0 : -ALT_AZ_GRID_ALT_MAX_DEG;
    const altSteps = Math.round((ALT_AZ_GRID_ALT_MAX_DEG - altMin) / MERIDIAN_ALT_STEP_DEG);

    // Altitude parallels: constant altitude, swept in azimuth.
    for (let alt = altMin; alt < ALT_AZ_GRID_ALT_MAX_DEG; alt += ALT_AZ_GRID_ALT_STEP_DEG) {
      this.appendSampledCurve(shape, azSteps, (i) => this.projectAltAz(alt, i * AZIMUTH_SWEEP_STEP_DEG));
    }
    // Azimuth meridians: constant azimuth, swept across the visible hemisphere(s).
    for (let az = 0; az < 360; az += ALT_AZ_GRID_AZ_STEP_DEG) {
      this.appendSampledCurve(shape, altSteps, (i) => this.projectAltAz(altMin + i * MERIDIAN_ALT_STEP_DEG, az));
    }
    return shape;
  }

  /**
   * Places altitude / azimuth tick labels on the alt/az grid. Altitude labels
   * stack along the meridian through the view center; azimuth labels sit just
   * above the horizon at each meridian.
   */
  private redrawHorizontalGridLabels(): void {
    const show = this.model.showGridProperty.value;
    for (const tick of this.horizontalTickLabels) {
      if (!show) {
        tick.label.visible = false;
        continue;
      }
      const placement =
        tick.kind === "alt"
          ? placeAltitudeLabel(this.projection, this.bounds2, tick.value)
          : placeAzimuthLabel(this.projection, this.bounds2, tick.value);
      if (!placement) {
        tick.label.visible = false;
        continue;
      }
      if (placement.align === "left") {
        tick.label.left = placement.point.x + 4;
        tick.label.centerY = placement.point.y;
      } else {
        tick.label.center = placement.point;
      }
      tick.label.visible = true;
    }
  }

  private meridianShape(): Shape {
    const shape = new Shape();
    // When the horizon is hidden the meridian continues into the lower hemisphere
    // (down to the nadir); otherwise it just dips slightly below the horizon line.
    const altMin = this.model.showHorizonProperty.value ? -10 : -90;
    // Local meridian: north (0°) and south (180°) altitude arcs.
    for (const az of [0, 180]) {
      let started = false;
      for (let alt = altMin; alt <= 90; alt += MERIDIAN_ALT_STEP_DEG) {
        const point = this.projectAltAz(alt, az);
        if (!point) {
          started = false;
          continue;
        }
        if (!started) {
          shape.moveTo(point.x, point.y);
          started = true;
        } else {
          shape.lineTo(point.x, point.y);
        }
      }
    }
    return shape;
  }

  private equatorialGridShape(): Shape {
    const shape = new Shape();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    const appendPolyline = (points: Vector2[]): void => {
      const first = points[0];
      if (!first || points.length < 2) {
        return;
      }
      shape.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const point = points[i];
        if (point) {
          shape.lineTo(point.x, point.y);
        }
      }
    };

    // Lines of constant RA (hour circles).
    for (let ra = 0; ra < 24; ra += EQUATORIAL_GRID_RA_STEP_HOURS) {
      const points: Vector2[] = [];
      for (
        let dec = EQUATORIAL_GRID_DEC_MIN_DEG;
        dec <= EQUATORIAL_GRID_DEC_MAX_DEG;
        dec += EQUATORIAL_SAMPLE_STEP_DEG
      ) {
        const { altDeg, azDeg } = equatorialToHorizontal(ra, dec, lat, lst);
        if (hideBelowHorizon && altDeg < 0) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        const point = this.projectAltAz(altDeg, azDeg);
        if (!point) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        points.push(point);
      }
      appendPolyline(points);
    }

    // Lines of constant Dec (parallels).
    for (
      let dec = EQUATORIAL_GRID_PARALLEL_DEC_MIN_DEG;
      dec <= EQUATORIAL_GRID_PARALLEL_DEC_MAX_DEG;
      dec += EQUATORIAL_GRID_DEC_STEP_DEG
    ) {
      const points: Vector2[] = [];
      for (let raStep = 0; raStep <= 360; raStep += EQUATORIAL_SAMPLE_STEP_DEG) {
        const ra = (raStep / 360) * 24;
        const { altDeg, azDeg } = equatorialToHorizontal(ra, dec, lat, lst);
        if (hideBelowHorizon && altDeg < 0) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        const point = this.projectAltAz(altDeg, azDeg);
        if (!point) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        points.push(point);
      }
      appendPolyline(points);
    }

    return shape;
  }

  /**
   * Places RA/Dec tick labels on visible grid lines. RA labels prefer the celestial
   * equator when it is in view; Dec labels prefer the sample nearest the FOV center.
   * The placement math itself lives in `sky-labels.ts` (pure, unit-tested).
   */
  private redrawEquatorialGridLabels(): void {
    const show = this.model.showEquatorialGridProperty.value;
    if (!show) {
      for (const { label } of this.equatorialTickLabels) {
        label.visible = false;
      }
      return;
    }

    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const center = this.bounds2.center;

    for (const tick of this.equatorialTickLabels) {
      const point =
        tick.kind === "ra"
          ? bestEquatorialLabelPointForRa(this.projection, this.bounds2, tick.value, lat, lst, hideBelowHorizon, center)
          : bestEquatorialLabelPointForDec(
              this.projection,
              this.bounds2,
              tick.value,
              lat,
              lst,
              hideBelowHorizon,
              center,
            );
      if (!point) {
        tick.label.visible = false;
        continue;
      }
      tick.label.center = point;
      tick.label.visible = true;
    }
  }

  private constellationShape(): Shape {
    const shape = new Shape();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;

    // Constellation stick figures are drawn as straight chords between their
    // anchor stars regardless of altitude: a figure dipping below the horizon
    // stays complete, and the ground overlay (when shown) occludes the portion
    // beneath the horizon. Only the projection's own viewport/antipode cull
    // drops a segment, so off-view segments simply don't render.
    for (const figure of CONSTELLATION_FIGURES) {
      for (const segment of figure.segments) {
        const from = constellationStarById(segment.fromId);
        const to = constellationStarById(segment.toId);
        if (!(from && to)) {
          continue;
        }
        const p0 = this.projection.projectVector(
          equatorialToHorizonVector(from.raHours, from.decDeg, lat, lst, this.model.precessionMatrix),
        );
        const p1 = this.projection.projectVector(
          equatorialToHorizonVector(to.raHours, to.decDeg, lat, lst, this.model.precessionMatrix),
        );
        if (!(p0 && p1)) {
          continue;
        }
        shape.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y);
      }
    }
    return shape;
  }

  private drawStarInto(
    shape: Shape,
    raHours: number,
    decDeg: number,
    mag: number,
    lat: number,
    lst: number,
    hideBelowHorizon: boolean,
    precession: PrecessionMatrix,
  ): void {
    // Project straight from the horizon-frame vector: its +Z component is the
    // "up" direction, so `vec.z < 0` is the below-horizon test with no alt/az
    // (atan2/asin) round-trip — this runs over every catalog star each frame.
    const vec = equatorialToHorizonVector(raHours, decDeg, lat, lst, precession);
    if (hideBelowHorizon && vec.z < 0) {
      return;
    }
    const point = this.projection.projectVector(vec);
    if (!point) {
      return;
    }
    const r = this.starRadius(mag);
    shape.moveTo(point.x + r, point.y);
    shape.arc(point.x, point.y, r, 0, Math.PI * 2);
  }

  private redrawStars(): Shape {
    const shape = new Shape();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const magLimit = this.model.magnitudeLimitProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const precession = this.model.precessionMatrix;

    if (this.model.deepStarCatalogProperty.value) {
      const { data, count } = getDeepStarData();
      for (let i = 0; i < count; i++) {
        const mag = data[i * 3 + 2];
        // Catalog is sorted ascending by magnitude, so stop early past the limit.
        if (mag === undefined || mag > magLimit) {
          break;
        }
        const ra = data[i * 3];
        const dec = data[i * 3 + 1];
        if (ra === undefined || dec === undefined) {
          break;
        }
        this.drawStarInto(shape, ra, dec, mag, lat, lst, hideBelowHorizon, precession);
      }
    } else {
      for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
        const mag = BRIGHT_STAR_MAG[i];
        if (mag === undefined || mag > magLimit) {
          continue;
        }
        const ra = BRIGHT_STAR_RA_HOURS[i];
        const dec = BRIGHT_STAR_DEC_DEG[i];
        if (ra === undefined || dec === undefined) {
          continue;
        }
        this.drawStarInto(shape, ra, dec, mag, lat, lst, hideBelowHorizon, precession);
      }
    }
    return shape;
  }

  private redrawStarLabels(): void {
    const show = this.model.showStarLabelsProperty.value;
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const magLimit = this.model.magnitudeLimitProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    for (const { starId, label } of this.starLabelNodes) {
      const star = namedStarById(starId);
      if (!(show && star) || star.mag > magLimit) {
        label.visible = false;
        continue;
      }
      const { altDeg, azDeg } = equatorialToHorizontal(
        star.raHours,
        star.decDeg,
        lat,
        lst,
        this.model.precessionMatrix,
      );
      if (hideBelowHorizon && altDeg < 0) {
        label.visible = false;
        continue;
      }
      const point = this.projectAltAz(altDeg, azDeg);
      if (!point) {
        label.visible = false;
        continue;
      }
      const r = this.starRadius(star.mag);
      label.left = point.x + r + LABEL_OFFSET_X;
      label.centerY = point.y + LABEL_OFFSET_Y;
      label.visible = true;
    }
  }

  private redrawCardinals(): void {
    const show = this.model.showCardinalsProperty.value;
    const labels = this.cardinalLabels;
    const mainCardinals: { node: Text; azDeg: number }[] = [
      { node: labels.north, azDeg: 0 },
      { node: labels.east, azDeg: 90 },
      { node: labels.south, azDeg: 180 },
      { node: labels.west, azDeg: 270 },
    ];
    const intercardinals: { node: Text; azDeg: number }[] = [
      { node: labels.northeast, azDeg: 45 },
      { node: labels.southeast, azDeg: 135 },
      { node: labels.southwest, azDeg: 225 },
      { node: labels.northwest, azDeg: 315 },
    ];

    // Cardinals sit along the horizon at their azimuth; the zenith marker sits
    // wherever the zenith projects. Each is shown only when it lands in view.
    const place = (node: Text, altDeg: number, azDeg: number): void => {
      const point = show ? this.projectAltAz(altDeg, azDeg) : null;
      if (!(point && this.bounds2.containsPoint(point))) {
        node.visible = false;
        return;
      }
      node.center = point;
      node.visible = true;
    };

    for (const { node, azDeg } of [...mainCardinals, ...intercardinals]) {
      place(node, CARDINAL_LABEL_ALTITUDE_DEG, azDeg);
    }
    place(labels.zenith, ZENITH_MARKER_ALTITUDE_DEG, this.model.lookAzimuthDegProperty.value);
  }

  private redrawSelection(): void {
    const selected = this.model.selectedObjectProperty.value;
    if (!selected) {
      this.selectionRing.visible = false;
      return;
    }

    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    const eq = this.model.equatorialOfSelected(selected);
    if (!eq) {
      this.selectionRing.visible = false;
      return;
    }
    const { altDeg, azDeg } = equatorialToHorizontal(eq.raHours, eq.decDeg, lat, lst);

    let radius: number;
    if (selected.kind === "star") {
      radius = this.starRadius(selected.mag) + SELECTION_RING_PADDING_PX;
    } else {
      const state = this.model.skySnapshotProperty.value.byId.get(selected.id);
      const visual = solarSystemBodyVisual(selected.id);
      radius = state
        ? this.planetsNode.discRadiusPx(visual, state.mag, state.distAu, this.projection, altDeg, azDeg) +
          SELECTION_RING_PADDING_PX
        : STAR_RADIUS_MAX + SELECTION_RING_PADDING_PX;
    }

    if (hideBelowHorizon && altDeg < 0) {
      this.selectionRing.visible = false;
      return;
    }

    const point = this.projectAltAz(altDeg, azDeg);
    if (!point) {
      this.selectionRing.visible = false;
      return;
    }

    this.selectionRing.radius = radius;
    this.selectionRing.center = point;
    this.selectionRing.visible = true;
  }

  private redrawConstellationLabels(): void {
    const show = this.model.showConstellationsProperty.value;
    const starVisibility = effectiveStarVisibility(
      this.model.solarAltitudeDegProperty.value,
      this.model.showAtmosphereProperty.value,
    );
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    for (const { starIds, label } of this.constellationLabelNodes) {
      if (!(show && starVisibility > CONSTELLATION_LABEL_MIN_VISIBILITY)) {
        label.visible = false;
        continue;
      }

      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (const starId of starIds) {
        const star = constellationStarById(starId);
        if (!star) {
          continue;
        }
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raHours,
          star.decDeg,
          lat,
          lst,
          this.model.precessionMatrix,
        );
        if (hideBelowHorizon && altDeg < 0) {
          continue;
        }
        const point = this.projectAltAz(altDeg, azDeg);
        if (!point) {
          continue;
        }
        sumX += point.x;
        sumY += point.y;
        count++;
      }

      if (count < 2) {
        label.visible = false;
        continue;
      }

      label.centerX = sumX / count;
      label.centerY = sumY / count;
      label.opacity = 0.55 + 0.35 * starVisibility;
      label.visible = true;
    }
  }

  private redrawTwilightSky(): void {
    const b = this.bounds2;
    const solarAlt = this.model.showAtmosphereProperty.value
      ? this.model.solarAltitudeDegProperty.value
      : ASTRONOMICAL_TWILIGHT_DEG - 1;
    const colors = twilightSkyColors(solarAlt, {
      nightZenith: ZenithColors.skyPanelColorProperty.value,
      nightHorizon: ZenithColors.skyNightHorizonColorProperty.value,
      nightGround: ZenithColors.groundColorProperty.value,
      dayZenith: ZenithColors.skyDayZenithColorProperty.value,
      dayHorizon: ZenithColors.skyDayHorizonColorProperty.value,
      dayGround: ZenithColors.groundDayColorProperty.value,
      twilightHorizon: ZenithColors.skyTwilightHorizonColorProperty.value,
    });

    // Sky background: a vertical zenith→horizon gradient filling the whole view.
    const gradient = new LinearGradient(b.centerX, b.minY, b.centerX, b.maxY);
    gradient.addColorStop(0, colors.zenith);
    gradient.addColorStop(1, colors.horizon);
    this.skyFill.fill = gradient;
    this.skyFill.setRect(b.minX, b.minY, b.width, b.height);

    // The ground tint follows the Sun every redraw; its outline is frame-anchored.
    this.groundFill.fill = colors.ground;
  }

  /** Rebuilds the horizon line and ground outline, which depend only on the alt/az frame. */
  private redrawHorizonShapes(): void {
    if (this.model.showHorizonProperty.value) {
      const { horizon, ground } = horizonAndGroundShapes(
        (altDeg, azDeg) => this.projection.project(altDeg, azDeg),
        this.bounds2,
      );
      this.groundFill.shape = ground;
      this.groundFill.visible = ground !== null;
      this.horizonLine.shape = horizon;
      this.horizonLine.visible = horizon !== null;
    } else {
      this.groundFill.visible = false;
      this.horizonLine.visible = false;
    }
  }

  /**
   * Rebuilds the observer-anchored layers — alt/az grid and its labels, meridian,
   * cardinal labels, horizon/ground outline. None depends on time, so these skip
   * the per-frame redraw while the clock plays (see {@link frameDirty}).
   */
  private redrawFrameLayers(): void {
    this.redrawHorizonShapes();

    this.gridPath.visible = this.model.showGridProperty.value;
    if (this.gridPath.visible) {
      this.gridPath.shape = this.altAzGridShape();
    }
    this.redrawHorizontalGridLabels();

    this.meridianPath.visible = this.model.showMeridianProperty.value;
    if (this.meridianPath.visible) {
      this.meridianPath.shape = this.meridianShape();
    }

    this.redrawCardinals();
  }

  private redraw(): void {
    this.projection = this.buildProjection();
    this.redrawTwilightSky();
    if (this.frameDirty) {
      this.frameDirty = false;
      this.redrawFrameLayers();
    }

    const starVisibility = effectiveStarVisibility(
      this.model.solarAltitudeDegProperty.value,
      this.model.showAtmosphereProperty.value,
    );
    this.starsPath.opacity = starVisibility;
    this.starLabelsLayer.opacity = starVisibility;
    this.constellationPath.opacity = 0.85 * starVisibility;
    this.constellationLabelsLayer.opacity = starVisibility;

    this.equatorialGridPath.visible = this.model.showEquatorialGridProperty.value;
    if (this.equatorialGridPath.visible) {
      this.equatorialGridPath.shape = this.equatorialGridShape();
    }
    this.redrawEquatorialGridLabels();

    this.constellationPath.visible =
      this.model.showConstellationsProperty.value && starVisibility > STAR_RENDER_MIN_VISIBILITY;
    if (this.constellationPath.visible) {
      this.constellationPath.shape = this.constellationShape();
    }

    this.starsPath.shape = starVisibility > STAR_RENDER_MIN_VISIBILITY ? this.redrawStars() : null;
    this.celestialLinesNode.redraw(this.projection);
    this.planetsNode.redraw(this.projection);
    this.redrawStarLabels();
    this.redrawConstellationLabels();
    this.redrawSelection();
  }
}
