/**
 * SelectedObjectReadout.ts
 *
 * Compact control-panel readout for the currently selected named star or planet:
 * name, type, constellation, magnitude, equatorial + horizontal coordinates,
 * solar elongation (planets), and rise / set / transit times.
 */

import {
  DerivedProperty,
  DynamicProperty,
  Multilink,
  PatternStringProperty,
  Property,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import { bodyNameProperty } from "../../common/bodyName.js";
import { formatDeg, formatDuration, formatHours, formatMag } from "../../common/format.js";
import { nextBodyEvents } from "../../common/sky/BodyEvents.js";
import { formatLocalSolarTime } from "../../common/sky/civilDateTime.js";
import { bodyElongation, constellationAt } from "../../common/sky/PlanetEphemeris.js";
import { rotateEquatorial } from "../../common/sky/Precession.js";
import { equatorialToHorizontal, riseSetInfo, solarHoursUntilLst } from "../../common/sky/SkyCoordinates.js";
import { ZENITH_CHECKBOX_OPTIONS } from "../../common/ZenithControlOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import ZenithColors from "../../ZenithColors.js";
import { CONTROL_FONT_SIZE, CONTROL_PANEL_WIDTH, SIDEREAL_HOURS_PER_SOLAR_HOUR } from "../../ZenithConstants.js";
import type { SelectedSkyObject } from "../model/SelectedSkyObject.js";
import type { ZenithModel } from "../model/ZenithModel.js";

const MS_PER_HOUR = 3600 * 1000;

type SelectionCoords = {
  kind: "star" | "planet" | "none";
  mag: number;
  raHours: number;
  decDeg: number;
  altDeg: number;
  azDeg: number;
};

const resolveStarName = (id: string, stars: ReturnType<StringManager["getStars"]>): TReadOnlyProperty<string> => {
  const key = `${id}StringProperty` as keyof typeof stars;
  return stars[key] as TReadOnlyProperty<string>;
};

const objectName = (
  selected: SelectedSkyObject | null,
  stars: ReturnType<StringManager["getStars"]>,
  noneLabel: string,
): string => {
  if (!selected) {
    return noneLabel;
  }
  if (selected.kind === "star") {
    return resolveStarName(selected.id, stars).value;
  }
  return bodyNameProperty(selected.id).value;
};

const buildCoords = (
  model: ZenithModel,
  selected: SelectedSkyObject | null,
  lat: number,
  lst: number,
): SelectionCoords => {
  if (!selected) {
    return { kind: "none", mag: 0, raHours: 0, decDeg: 0, altDeg: 0, azDeg: 0 };
  }
  const eq = model.equatorialOfSelected(selected);
  if (!eq) {
    return { kind: "none", mag: 0, raHours: 0, decDeg: 0, altDeg: 0, azDeg: 0 };
  }
  const { altDeg, azDeg } = equatorialToHorizontal(eq.raHours, eq.decDeg, lat, lst);
  return {
    kind: selected.kind,
    mag: eq.mag,
    raHours: eq.raHours,
    decDeg: eq.decDeg,
    altDeg,
    azDeg,
  };
};

type Visibility = {
  kind: "none" | "risesSets" | "circumpolar" | "neverRises";
  riseInHours: number;
  riseAzDeg: number;
  riseClock: string;
  setInHours: number;
  setAzDeg: number;
  setClock: string;
  transitInHours: number;
  transitAltDeg: number;
  transitClock: string;
};

const NO_VISIBILITY: Visibility = {
  kind: "none",
  riseInHours: 0,
  riseAzDeg: 0,
  riseClock: "—",
  setInHours: 0,
  setAzDeg: 0,
  setClock: "—",
  transitInHours: 0,
  transitAltDeg: 0,
  transitClock: "—",
};

/**
 * When each event next happens for the selected object, relative to the current
 * LST, plus the observer's local-solar clock time of that event.
 */
const buildVisibility = (
  model: ZenithModel,
  selected: SelectedSkyObject | null,
  lat: number,
  lst: number,
  civilTimeMs: number,
  longitudeDeg: number,
): Visibility => {
  if (!selected) {
    return NO_VISIBILITY;
  }
  const eq = model.equatorialOfSelected(selected);
  if (!eq) {
    return NO_VISIBILITY;
  }
  // Local-solar clock time of an event `hoursUntil` solar hours from now.
  const clockAt = (hoursUntil: number): string =>
    formatLocalSolarTime(civilTimeMs + hoursUntil * MS_PER_HOUR, longitudeDeg);

  if (selected.kind === "planet") {
    const events = nextBodyEvents(selected.id, civilTimeMs, lat, longitudeDeg);
    if (events.band === "neverRises") {
      return { ...NO_VISIBILITY, kind: "neverRises" };
    }
    const transit = events.transit;
    const transitInHours = transit ? (transit.timeMs - civilTimeMs) / MS_PER_HOUR : 0;
    if (events.band === "circumpolar" || !events.rise || !events.set) {
      return {
        ...NO_VISIBILITY,
        kind: "circumpolar",
        transitInHours,
        transitAltDeg: transit?.altitudeDeg ?? 0,
        transitClock: clockAt(transitInHours),
      };
    }
    const riseInHours = (events.rise.timeMs - civilTimeMs) / MS_PER_HOUR;
    const setInHours = (events.set.timeMs - civilTimeMs) / MS_PER_HOUR;
    return {
      kind: "risesSets",
      riseInHours,
      riseAzDeg: events.rise.azimuthDeg,
      riseClock: clockAt(riseInHours),
      setInHours,
      setAzDeg: events.set.azimuthDeg,
      setClock: clockAt(setInHours),
      transitInHours,
      transitAltDeg: transit?.altitudeDeg ?? 0,
      transitClock: clockAt(transitInHours),
    };
  }

  const info = riseSetInfo(eq.raHours, eq.decDeg, lat);
  const transitInHours = solarHoursUntilLst(lst, info.transitLstHours, SIDEREAL_HOURS_PER_SOLAR_HOUR);
  if (info.band === "neverRises") {
    return { ...NO_VISIBILITY, kind: "neverRises" };
  }
  if (info.band === "circumpolar" || info.riseLstHours === null || info.setLstHours === null) {
    return {
      ...NO_VISIBILITY,
      kind: "circumpolar",
      transitInHours,
      transitAltDeg: info.transitAltitudeDeg,
      transitClock: clockAt(transitInHours),
    };
  }
  const riseInHours = solarHoursUntilLst(lst, info.riseLstHours, SIDEREAL_HOURS_PER_SOLAR_HOUR);
  const setInHours = solarHoursUntilLst(lst, info.setLstHours, SIDEREAL_HOURS_PER_SOLAR_HOUR);
  return {
    kind: "risesSets",
    riseInHours,
    riseAzDeg: info.riseAzimuthDeg ?? 0,
    riseClock: clockAt(riseInHours),
    setInHours,
    setAzDeg: info.setAzimuthDeg ?? 0,
    setClock: clockAt(setInHours),
    transitInHours,
    transitAltDeg: info.transitAltitudeDeg,
    transitClock: clockAt(transitInHours),
  };
};

export class SelectedObjectReadout extends Node {
  /**
   * Teardown steps for the axon graph this node builds, in the order they must
   * run: internal links first, then the Text/Checkbox subtree, then the pattern
   * Properties they read, then the DerivedProperties those patterns depend on.
   * `DerivedProperty.dispose()` throws while it still has listeners, so the order
   * matters — each stage releases the subscribers of the next.
   */
  private readonly disposers: (() => void)[] = [];

  public constructor(model: ZenithModel) {
    super();

    const stringManager = StringManager.getInstance();
    const controls = stringManager.getControls();
    const a11y = stringManager.getA11yStrings();
    const stars = stringManager.getStars();
    const labelFont = new PhetFont(CONTROL_FONT_SIZE);
    const maxWidth = CONTROL_PANEL_WIDTH - 40;

    const nameProperty = new Property(
      objectName(model.selectedObjectProperty.value, stars, controls.selectedNoneStringProperty.value),
    );
    const nameMultilink = Multilink.multilink(
      [model.selectedObjectProperty, controls.selectedNoneStringProperty],
      (selected, noneLabel) => {
        nameProperty.value = objectName(selected, stars, noneLabel);
      },
    );

    const coordsProperty = new DerivedProperty(
      [
        model.selectedObjectProperty,
        model.skySnapshotProperty,
        model.latitudeProperty,
        model.localSiderealTimeHoursProperty,
      ],
      (selected, _snapshot, lat, lst) => buildCoords(model, selected, lat, lst),
    );

    const magProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatMag(s.mag)));
    const raProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatHours(s.raHours)));
    const decProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatDeg(s.decDeg)));
    const altProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatDeg(s.altDeg)));
    const azProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatDeg(s.azDeg)));

    // Type: the Sun is a star, the Moon its own kind, everything else a planet.
    const typeNameProperty = new DerivedProperty(
      [
        model.selectedObjectProperty,
        controls.typeStarStringProperty,
        controls.typePlanetStringProperty,
        controls.typeMoonStringProperty,
      ],
      (selected, starLabel, planetLabel, moonLabel) => {
        if (!selected) {
          return "";
        }
        if (selected.kind === "star" || selected.id === "sun") {
          return starLabel;
        }
        if (selected.id === "moon") {
          return moonLabel;
        }
        return planetLabel;
      },
    );

    // Constellation of the current position, localized via the `constellations`
    // string group. Planets drift between constellations as time advances, so
    // this re-resolves from the live equatorial coordinates.
    const constellations = stringManager.getConstellations();
    const constellationSourceProperty = new DerivedProperty([coordsProperty], (s): TReadOnlyProperty<string> => {
      if (s.kind === "none") {
        return controls.selectedNoneStringProperty; // hidden while unselected; harmless placeholder
      }
      const j2000 = rotateEquatorial(s.raHours, s.decDeg, model.precessionMatrix, true);
      const { key, name } = constellationAt(j2000.raHours, j2000.decDeg);
      const localized = constellations[`${key}StringProperty` as keyof typeof constellations] as
        | TReadOnlyProperty<string>
        | undefined;
      return localized ?? new Property(name);
    });
    const constellationNameProperty = new DynamicProperty(constellationSourceProperty);

    // Elongation from the Sun (planets only, not the Sun itself). East = evening
    // side of the Sun, West = morning side, in place of a signed angle.
    const elongationProperty = new DerivedProperty(
      [
        model.selectedObjectProperty,
        model.skySnapshotProperty,
        model.civilTimeMsProperty,
        controls.elongationEastStringProperty,
        controls.elongationWestStringProperty,
      ],
      (selected, _snapshot, civilMs, eastLabel, westLabel) => {
        if (selected?.kind !== "planet") {
          return null;
        }
        const elong = bodyElongation(selected.id, civilMs);
        if (!elong) {
          return null;
        }
        return { deg: formatDeg(elong.elongationDeg), dir: elong.direction === "east" ? eastLabel : westLabel };
      },
    );
    const elongDegProperty = new DerivedProperty([elongationProperty], (e) => (e ? e.deg : "—"));
    const elongDirProperty = new DerivedProperty([elongationProperty], (e) => (e ? e.dir : ""));

    // Pattern Properties are hoisted (rather than built inline in each Text) so
    // dispose() can release them after the Texts that read them are torn down.
    const patterns: { dispose: () => void }[] = [];
    const pattern = <T extends { dispose: () => void }>(property: T): T => {
      patterns.push(property);
      return property;
    };

    const nameText = new Text(
      pattern(new PatternStringProperty(controls.selectedObjectStringProperty, { name: nameProperty })),
      { font: labelFont, fill: ZenithColors.accentColorProperty, maxWidth },
    );
    const noneText = new Text(controls.selectedNoneStringProperty, {
      font: labelFont,
      fill: ZenithColors.textColorProperty,
      maxWidth,
    });
    const magText = new Text(
      pattern(new PatternStringProperty(controls.selectedMagStringProperty, { mag: magProperty })),
      {
        font: labelFont,
        fill: ZenithColors.textColorProperty,
        maxWidth,
      },
    );
    const eqText = new Text(
      pattern(
        new PatternStringProperty(controls.selectedEquatorialStringProperty, {
          ra: raProperty,
          dec: decProperty,
        }),
      ),
      { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth },
    );
    const hzText = new Text(
      pattern(
        new PatternStringProperty(controls.selectedHorizontalStringProperty, {
          alt: altProperty,
          az: azProperty,
        }),
      ),
      { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth },
    );
    const typeText = new Text(
      pattern(new PatternStringProperty(controls.selectedTypeStringProperty, { type: typeNameProperty })),
      {
        font: labelFont,
        fill: ZenithColors.textColorProperty,
        maxWidth,
      },
    );
    const constellationText = new Text(
      pattern(
        new PatternStringProperty(controls.selectedConstellationStringProperty, {
          constellation: constellationNameProperty,
        }),
      ),
      { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth },
    );
    const elongationText = new Text(
      pattern(
        new PatternStringProperty(controls.selectedElongationStringProperty, {
          deg: elongDegProperty,
          dir: elongDirProperty,
        }),
      ),
      { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth },
    );

    // ── Rise / set / transit (event times relative to now, at the sidereal rate) ──
    const visibilityProperty = new DerivedProperty(
      [
        model.selectedObjectProperty,
        model.skySnapshotProperty,
        model.latitudeProperty,
        model.localSiderealTimeHoursProperty,
        model.civilTimeMsProperty,
        model.longitudeProperty,
      ],
      (selected, _snapshot, lat, lst, civilMs, lon) => buildVisibility(model, selected, lat, lst, civilMs, lon),
    );

    const durationDependencies = [
      visibilityProperty,
      controls.durationHourStringProperty,
      controls.durationMinuteStringProperty,
    ] as const;
    const riseTimeProperty = new DerivedProperty(durationDependencies, (v, hour, minute) =>
      formatDuration(v.riseInHours, hour, minute),
    );
    const riseAzProperty = new DerivedProperty([visibilityProperty], (v) => formatDeg(v.riseAzDeg));
    const riseClockProperty = new DerivedProperty([visibilityProperty], (v) => v.riseClock);
    const setTimeProperty = new DerivedProperty(durationDependencies, (v, hour, minute) =>
      formatDuration(v.setInHours, hour, minute),
    );
    const setAzProperty = new DerivedProperty([visibilityProperty], (v) => formatDeg(v.setAzDeg));
    const setClockProperty = new DerivedProperty([visibilityProperty], (v) => v.setClock);
    const transitTimeProperty = new DerivedProperty(durationDependencies, (v, hour, minute) =>
      formatDuration(v.transitInHours, hour, minute),
    );
    const transitAltProperty = new DerivedProperty([visibilityProperty], (v) => formatDeg(v.transitAltDeg));
    const transitClockProperty = new DerivedProperty([visibilityProperty], (v) => v.transitClock);

    const eventTextOptions = { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth };
    const riseText = new Text(
      pattern(
        new PatternStringProperty(controls.selectedRiseStringProperty, {
          time: riseTimeProperty,
          clock: riseClockProperty,
          az: riseAzProperty,
        }),
      ),
      eventTextOptions,
    );
    const setText = new Text(
      pattern(
        new PatternStringProperty(controls.selectedSetStringProperty, {
          time: setTimeProperty,
          clock: setClockProperty,
          az: setAzProperty,
        }),
      ),
      eventTextOptions,
    );
    const transitText = new Text(
      pattern(
        new PatternStringProperty(controls.selectedTransitStringProperty, {
          time: transitTimeProperty,
          clock: transitClockProperty,
          alt: transitAltProperty,
        }),
      ),
      eventTextOptions,
    );
    const circumpolarText = new Text(controls.selectedCircumpolarStringProperty, eventTextOptions);
    const neverRisesText = new Text(controls.selectedNeverRisesStringProperty, eventTextOptions);

    const onVisibility = (v: Visibility): void => {
      riseText.visible = v.kind === "risesSets";
      setText.visible = v.kind === "risesSets";
      transitText.visible = v.kind === "risesSets" || v.kind === "circumpolar";
      circumpolarText.visible = v.kind === "circumpolar";
      neverRisesText.visible = v.kind === "neverRises";
    };
    visibilityProperty.link(onVisibility);

    const onCoords = (coords: SelectionCoords): void => {
      const hasSelection = coords.kind !== "none";
      noneText.visible = !hasSelection;
      nameText.visible = hasSelection;
      typeText.visible = hasSelection;
      constellationText.visible = hasSelection;
      magText.visible = hasSelection;
      eqText.visible = hasSelection;
      hzText.visible = hasSelection;
    };
    coordsProperty.link(onCoords);

    // Elongation only applies to planets (and the Moon), never a bare star or the Sun.
    const onElongation = (elong: { deg: string; dir: string } | null): void => {
      elongationText.visible = elong !== null;
    };
    elongationProperty.link(onElongation);

    // ── Track toggle (enabled only when an object is selected) ────────────────
    const trackEnabledProperty = new DerivedProperty([model.selectedObjectProperty], (s) => s !== null);
    const trackCheckbox = new Checkbox(
      model.trackSelectedObjectProperty,
      new Text(controls.trackSelectedStringProperty, {
        font: labelFont,
        fill: ZenithColors.textColorProperty,
        maxWidth,
      }),
      {
        ...ZENITH_CHECKBOX_OPTIONS,
        // Not owned by the Checkbox (EnabledComponent only disposes an
        // enabledProperty it created), so dispose() below releases it.
        enabledProperty: trackEnabledProperty,
        accessibleName: a11y.controls.trackSelectedStringProperty,
      },
    );

    this.addChild(
      new VBox({
        spacing: 2,
        align: "left",
        children: [
          noneText,
          nameText,
          typeText,
          constellationText,
          magText,
          eqText,
          hzText,
          elongationText,
          transitText,
          riseText,
          setText,
          circumpolarText,
          neverRisesText,
          trackCheckbox,
        ],
      }),
    );

    // ── Teardown, in dependency order ─────────────────────────────────────────
    // 1. Internal listeners on Properties we are about to dispose.
    this.disposers.push(() => {
      visibilityProperty.unlink(onVisibility);
      coordsProperty.unlink(onCoords);
      elongationProperty.unlink(onElongation);
      nameMultilink.dispose();
    });
    // 2. Pattern Properties (their Text readers are disposed by dispose() first).
    this.disposers.push(() => {
      for (const patternProperty of patterns) {
        patternProperty.dispose();
      }
    });
    // 3. Derived Properties that fed those patterns, leaf-most first…
    this.disposers.push(() => {
      for (const property of [
        magProperty,
        raProperty,
        decProperty,
        altProperty,
        azProperty,
        typeNameProperty,
        constellationNameProperty,
        constellationSourceProperty,
        elongDegProperty,
        elongDirProperty,
        riseTimeProperty,
        riseAzProperty,
        riseClockProperty,
        setTimeProperty,
        setAzProperty,
        setClockProperty,
        transitTimeProperty,
        transitAltProperty,
        transitClockProperty,
      ]) {
        property.dispose();
      }
    });
    // 4. …then the bases they derived from, and the standalone Properties.
    this.disposers.push(() => {
      coordsProperty.dispose();
      visibilityProperty.dispose();
      elongationProperty.dispose();
      trackEnabledProperty.dispose();
      nameProperty.dispose();
    });
  }

  /**
   * Releases this panel's axon graph. `Node.dispose()` only detaches children, so
   * the readout's Texts, its pattern Properties, and the ~20 DerivedProperties
   * behind them would otherwise stay subscribed to the model and the shared
   * StringManager after the screen is torn down. Children are disposed between
   * stages 1 and 2 so no Text is still reading a pattern when it is released.
   * Idempotent — the disposer list is drained on the first call.
   */
  public override dispose(): void {
    const [detachListeners, disposePatterns, ...rest] = this.disposers.splice(0);
    detachListeners?.();

    const children = this.children;
    super.dispose();
    for (const child of children) {
      child.disposeSubtree();
    }

    disposePatterns?.();
    for (const disposeStage of rest) {
      disposeStage();
    }
  }
}
