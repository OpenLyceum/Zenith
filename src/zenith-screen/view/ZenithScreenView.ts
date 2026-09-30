/**
 * ZenithScreenView.ts
 *
 * Root view for the planetarium screen. The sky fills the full visible window
 * (including past layoutBounds); observer / time / display controls overlay it.
 */

import { BooleanProperty } from "scenerystack/axon";
import { type Bounds2, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { GridBox, HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { InfoButton, NumberControl, PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { Dialog, ScreenView } from "scenerystack/sim";
import { AccordionBox, Checkbox, ComboBox, RectangularPushButton } from "scenerystack/sun";
import { resolveObserverLocation } from "../../common/resolveObserverLocation.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  SIM_COMBO_BOX_OPTIONS,
} from "../../common/ZenithButtonOptions.js";
import { ZENITH_CHECKBOX_OPTIONS, ZENITH_NUMBER_CONTROL_OPTIONS } from "../../common/ZenithControlOptions.js";
import { ZenithPanel } from "../../common/ZenithPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import ZenithColors from "../../ZenithColors.js";
import {
  CONTROL_FONT_SIZE,
  CONTROL_PANEL_WIDTH,
  FIELD_OF_VIEW_RANGE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  MAGNITUDE_LIMIT_RANGE,
  PANEL_CONTENT_SPACING,
  PANEL_CORNER_RADIUS,
  PANEL_TITLE_FONT_SIZE,
  PANEL_X_MARGIN,
  PANEL_Y_MARGIN,
  SCREEN_VIEW_MARGIN,
} from "../../ZenithConstants.js";
import { LocationPreset } from "../model/LocationPreset.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import { attachPlanetariumInteraction } from "./attachPlanetariumInteraction.js";
import { ObjectNameSearch } from "./ObjectNameSearch.js";
import { ObserverLocationNode } from "./ObserverLocationNode.js";
import { PlanetariumSkyNode } from "./PlanetariumSkyNode.js";
import { SelectedObjectReadout } from "./SelectedObjectReadout.js";
import { TimeControlPanel } from "./TimeControlPanel.js";
import { ZenithInfoDialogContent } from "./ZenithInfoDialogContent.js";
import { ZenithScreenSummaryContent } from "./ZenithScreenSummaryContent.js";

/** Gap between the control panel and Reset All when they would overlap. */
const RESET_ALL_PANEL_GAP = 8;

/** Inset of the selection readout from the play-area edges. */
const SELECTION_PANEL_INSET = 8;

/**
 * Extra clearance above the bottom edge so the selection readout clears the
 * Joist navigation bar, which overlaps the bottom of the play area.
 */
const SELECTION_PANEL_BOTTOM_CLEARANCE = 52;

export type ZenithScreenViewOptions = ScreenViewOptions;

export class ZenithScreenView extends ScreenView {
  private readonly skyNode: PlanetariumSkyNode;
  private readonly selectedReadout: SelectedObjectReadout;
  private readonly searchNode: ObjectNameSearch;
  private readonly controlPanel: AccordionBox;
  private readonly timePanel: TimeControlPanel;
  private readonly locationPanel: AccordionBox;

  /**
   * Teardown callbacks for constructor-time links (visibleBounds, panel bounds,
   * planetarium interaction). Run from {@link dispose}.
   */
  private readonly disposers: (() => void)[] = [];

  public constructor(model: ZenithModel, providedOptions?: ZenithScreenViewOptions) {
    const options = optionize<ZenithScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new ZenithScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const stringManager = StringManager.getInstance();
    const controls = stringManager.getControls();
    const locations = stringManager.getLocations();
    const a11y = stringManager.getA11yStrings();

    // ── Background ────────────────────────────────────────────────────────────
    // Fills the window (visibleBounds), which can extend past layoutBounds.
    const backgroundRect = new Rectangle(0, 0, 1, 1, {
      fill: ZenithColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Control panel (built first so the play area can fill the remainder) ───
    const labelFont = new PhetFont(CONTROL_FONT_SIZE);
    const titleOptions = {
      font: labelFont,
      fill: ZenithColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH - 40,
    };
    const comboItemFont = new PhetFont(CONTROL_FONT_SIZE);
    const comboItem = (labelProperty: typeof locations.boulderStringProperty) => ({
      createNode: () =>
        new Text(labelProperty, {
          font: comboItemFont,
          fill: LIGHT_SURFACE_TEXT_FILL,
          maxWidth: CONTROL_PANEL_WIDTH - 50,
        }),
    });

    const locationCombo = new ComboBox(
      model.locationPresetProperty,
      [
        { value: LocationPreset.BOULDER, ...comboItem(locations.boulderStringProperty) },
        { value: LocationPreset.GREENWICH, ...comboItem(locations.greenwichStringProperty) },
        { value: LocationPreset.EQUATOR, ...comboItem(locations.equatorStringProperty) },
        { value: LocationPreset.NORTH_POLE, ...comboItem(locations.northPoleStringProperty) },
        { value: LocationPreset.SOUTH_POLE, ...comboItem(locations.southPoleStringProperty) },
        { value: LocationPreset.SYDNEY, ...comboItem(locations.sydneyStringProperty) },
        { value: LocationPreset.CUSTOM, ...comboItem(locations.customStringProperty) },
      ],
      this,
      {
        ...SIM_COMBO_BOX_OPTIONS,
        accessibleName: a11y.controls.locationStringProperty,
      },
    );

    const latitudeControl = new NumberControl(controls.latitudeStringProperty, model.latitudeProperty, LATITUDE_RANGE, {
      ...ZENITH_NUMBER_CONTROL_OPTIONS,
      delta: 0.5,
      numberDisplayOptions: {
        decimalPlaces: 1,
        valuePattern: "{{value}}°",
      },
      titleNodeOptions: titleOptions,
      accessibleName: a11y.controls.latitudeStringProperty,
    });

    const longitudeControl = new NumberControl(
      controls.longitudeStringProperty,
      model.longitudeProperty,
      LONGITUDE_RANGE,
      {
        ...ZENITH_NUMBER_CONTROL_OPTIONS,
        delta: 0.5,
        numberDisplayOptions: {
          decimalPlaces: 1,
          valuePattern: "{{value}}°",
        },
        titleNodeOptions: titleOptions,
        accessibleName: a11y.controls.longitudeStringProperty,
      },
    );

    const fovControl = new NumberControl(
      controls.fieldOfViewStringProperty,
      model.fieldOfViewDegProperty,
      FIELD_OF_VIEW_RANGE,
      {
        ...ZENITH_NUMBER_CONTROL_OPTIONS,
        delta: 5,
        numberDisplayOptions: {
          decimalPlaces: 0,
          valuePattern: "{{value}}°",
        },
        titleNodeOptions: titleOptions,
        accessibleName: a11y.controls.fieldOfViewStringProperty,
      },
    );

    const magnitudeControl = new NumberControl(
      controls.magnitudeLimitStringProperty,
      model.magnitudeLimitProperty,
      MAGNITUDE_LIMIT_RANGE,
      {
        ...ZENITH_NUMBER_CONTROL_OPTIONS,
        delta: 0.1,
        numberDisplayOptions: {
          decimalPlaces: 1,
        },
        titleNodeOptions: titleOptions,
        accessibleName: a11y.controls.magnitudeLimitStringProperty,
      },
    );

    this.selectedReadout = new SelectedObjectReadout(model);

    const checkbox = (
      property: typeof model.showGridProperty,
      labelProperty: typeof controls.showGridStringProperty,
      accessibleName: typeof a11y.controls.showGridStringProperty,
    ): Checkbox =>
      new Checkbox(
        property,
        new Text(labelProperty, {
          font: labelFont,
          fill: ZenithColors.textColorProperty,
          maxWidth: CONTROL_PANEL_WIDTH / 2 - 30,
        }),
        {
          ...ZENITH_CHECKBOX_OPTIONS,
          accessibleName,
        },
      );

    const gridCheckbox = checkbox(
      model.showGridProperty,
      controls.showGridStringProperty,
      a11y.controls.showGridStringProperty,
    );
    const cardinalsCheckbox = checkbox(
      model.showCardinalsProperty,
      controls.showCardinalsStringProperty,
      a11y.controls.showCardinalsStringProperty,
    );
    const meridianCheckbox = checkbox(
      model.showMeridianProperty,
      controls.showMeridianStringProperty,
      a11y.controls.showMeridianStringProperty,
    );
    const equatorialGridCheckbox = checkbox(
      model.showEquatorialGridProperty,
      controls.showEquatorialGridStringProperty,
      a11y.controls.showEquatorialGridStringProperty,
    );
    const horizonCheckbox = checkbox(
      model.showHorizonProperty,
      controls.showHorizonStringProperty,
      a11y.controls.showHorizonStringProperty,
    );
    const atmosphereCheckbox = checkbox(
      model.showAtmosphereProperty,
      controls.showAtmosphereStringProperty,
      a11y.controls.showAtmosphereStringProperty,
    );
    const planetsCheckbox = checkbox(
      model.showPlanetsProperty,
      controls.showPlanetsStringProperty,
      a11y.controls.showPlanetsStringProperty,
    );
    const trueScaleCheckbox = checkbox(
      model.trueScaleBodiesProperty,
      controls.trueScaleBodiesStringProperty,
      a11y.controls.trueScaleBodiesStringProperty,
    );
    const eclipticCheckbox = checkbox(
      model.showEclipticProperty,
      controls.showEclipticStringProperty,
      a11y.controls.showEclipticStringProperty,
    );
    const celestialEquatorCheckbox = checkbox(
      model.showCelestialEquatorProperty,
      controls.showCelestialEquatorStringProperty,
      a11y.controls.showCelestialEquatorStringProperty,
    );
    const objectPathCheckbox = checkbox(
      model.showObjectPathProperty,
      controls.showObjectPathStringProperty,
      a11y.controls.showObjectPathStringProperty,
    );

    // Star names, constellation lines, and planet labels live in Preferences → Simulation.
    const displayToggles = new GridBox({
      rows: [
        [gridCheckbox, cardinalsCheckbox],
        [meridianCheckbox, equatorialGridCheckbox],
        [horizonCheckbox, planetsCheckbox],
        [atmosphereCheckbox, trueScaleCheckbox],
        [eclipticCheckbox, celestialEquatorCheckbox],
        [objectPathCheckbox],
      ],
      xSpacing: 8,
      ySpacing: 4,
      xAlign: "left",
      yAlign: "center",
    });

    const panelContent = new VBox({
      spacing: PANEL_CONTENT_SPACING,
      align: "left",
      children: [fovControl, magnitudeControl, displayToggles],
    });

    const panelTitle = new Text(controls.panelTitleStringProperty, {
      font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
      fill: ZenithColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH - 50,
    });

    // Overlay panel: floats on top of the full-bleed sky (does not shrink it).
    this.controlPanel = new AccordionBox(panelContent, {
      titleNode: panelTitle,
      expandedProperty: new BooleanProperty(true),
      resize: true,
      useExpandedBoundsWhenCollapsed: false,
      useContentWidthWhenCollapsed: false,
      cornerRadius: PANEL_CORNER_RADIUS,
      fill: ZenithColors.panelBackgroundColorProperty,
      stroke: ZenithColors.panelBorderColorProperty,
      contentXMargin: PANEL_X_MARGIN,
      contentYMargin: PANEL_Y_MARGIN,
      contentAlign: "left",
      titleAlignX: "left",
      buttonAlign: "right",
      showTitleWhenExpanded: true,
      titleBarOptions: {
        fill: ZenithColors.panelBackgroundColorProperty,
      },
      expandCollapseButtonOptions: {
        accessibleName: a11y.controls.controlPanelStringProperty,
      },
      accessibleContextResponseExpanded: a11y.controls.controlPanelExpandedStringProperty,
      accessibleContextResponseCollapsed: a11y.controls.controlPanelCollapsedStringProperty,
      accessibleHelpTextExpanded: a11y.controls.controlPanelHelpExpandedStringProperty,
      accessibleHelpTextCollapsed: a11y.controls.controlPanelHelpCollapsedStringProperty,
    });

    // ── Time panel: preset combo, date jump, Now, sidereal jumps, playback rate ─
    this.timePanel = new TimeControlPanel(model, this);

    // ── Observer-location panel: combo + lat/lon controls + draggable Earth ───
    const observerLocationMap = new ObserverLocationNode(model.latitudeProperty, model.longitudeProperty, {
      mapWidth: CONTROL_PANEL_WIDTH - 2 * PANEL_X_MARGIN,
      accessibleName: a11y.controls.observerLocationMapStringProperty,
      accessibleHelpText: a11y.controls.observerLocationMapHelpStringProperty,
    });

    // "Use my location": browser geolocation only (no third-party IP lookup).
    const useMyLocationButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(controls.useMyLocationStringProperty, {
        font: labelFont,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: CONTROL_PANEL_WIDTH - 140,
      }),
      accessibleName: a11y.controls.useMyLocationStringProperty,
      accessibleHelpText: a11y.controls.useMyLocationHelpStringProperty,
      listener: () => {
        useMyLocationButton.enabled = false;
        useMyLocationButton.addAccessibleResponse(a11y.controls.useMyLocationPendingStringProperty);
        resolveObserverLocation()
          .then(({ latitudeDeg, longitudeDeg }) => {
            const lat = LATITUDE_RANGE.constrainValue(Math.round(latitudeDeg * 10) / 10);
            const lon = LONGITUDE_RANGE.constrainValue(Math.round(longitudeDeg * 10) / 10);
            model.latitudeProperty.value = lat;
            model.longitudeProperty.value = lon;
            // One-shot announcement: a plain filled-in string, not a per-click
            // PatternStringProperty that would never be disposed.
            useMyLocationButton.addAccessibleResponse(
              StringUtils.fillIn(a11y.controls.useMyLocationSuccessStringProperty.value, {
                lat: toFixed(lat, 1),
                lon: toFixed(lon, 1),
              }),
            );
          })
          .catch(() => {
            useMyLocationButton.addAccessibleResponse(a11y.controls.useMyLocationErrorStringProperty);
          })
          .finally(() => {
            useMyLocationButton.enabled = true;
          });
      },
    });

    const locationRow = new HBox({
      spacing: PANEL_CONTENT_SPACING,
      children: [locationCombo, useMyLocationButton],
    });

    const locationPanelContent = new VBox({
      spacing: PANEL_CONTENT_SPACING,
      align: "left",
      children: [locationRow, observerLocationMap, latitudeControl, longitudeControl],
    });

    const locationPanelTitle = new Text(controls.observerLocationPanelTitleStringProperty, {
      font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
      fill: ZenithColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH - 50,
    });

    this.locationPanel = new AccordionBox(locationPanelContent, {
      titleNode: locationPanelTitle,
      expandedProperty: new BooleanProperty(true),
      resize: true,
      useExpandedBoundsWhenCollapsed: false,
      useContentWidthWhenCollapsed: false,
      cornerRadius: PANEL_CORNER_RADIUS,
      fill: ZenithColors.panelBackgroundColorProperty,
      stroke: ZenithColors.panelBorderColorProperty,
      contentXMargin: PANEL_X_MARGIN,
      contentYMargin: PANEL_Y_MARGIN,
      contentAlign: "left",
      titleAlignX: "left",
      buttonAlign: "right",
      showTitleWhenExpanded: true,
      titleBarOptions: {
        fill: ZenithColors.panelBackgroundColorProperty,
      },
      expandCollapseButtonOptions: {
        accessibleName: a11y.controls.observerLocationPanelStringProperty,
      },
      accessibleContextResponseExpanded: a11y.controls.observerLocationPanelExpandedStringProperty,
      accessibleContextResponseCollapsed: a11y.controls.observerLocationPanelCollapsedStringProperty,
      accessibleHelpTextExpanded: a11y.controls.observerLocationPanelHelpExpandedStringProperty,
      accessibleHelpTextCollapsed: a11y.controls.observerLocationPanelHelpCollapsedStringProperty,
    });

    // ── Planetarium FOV play area (full visible window, under chrome) ─────────
    this.skyNode = new PlanetariumSkyNode(model, {
      bounds: this.visibleBoundsProperty.value.copy(),
    });
    const interaction = attachPlanetariumInteraction(this.skyNode, {
      model,
      skyNode: this.skyNode,
      accessibleNameProperty: a11y.controls.skyViewStringProperty,
      accessibleHelpTextProperty: a11y.controls.skyViewHelpStringProperty,
    });
    this.disposers.push(interaction.dispose);
    this.addChild(this.skyNode);

    // Selection readout sits over the sky (bottom-left).
    const selectionPanel = new ZenithPanel(this.selectedReadout, {
      xMargin: 8,
      yMargin: 6,
    });
    this.addChild(selectionPanel);

    // Subtle discoverability hint along the bottom of the sky.
    const onscreenHint = new Text(controls.onscreenHintStringProperty, {
      font: new PhetFont(11),
      fill: ZenithColors.textColorProperty,
      opacity: 0.55,
      pickable: false,
    });
    this.addChild(onscreenHint);

    // Type-ahead name search (top-center overlay) — selects and tracks on Enter.
    this.searchNode = new ObjectNameSearch(model);

    // Panels and Reset All sit above the sky so they remain interactive.
    this.addChild(this.locationPanel);
    this.addChild(this.timePanel);
    this.addChild(this.controlPanel);
    this.addChild(this.searchNode);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      accessibleName: a11y.controls.resetAllStringProperty,
    });
    this.addChild(resetAllButton);

    // Info button (next to Reset All) opens a "how to use" dialog. The dialog is
    // built lazily on first press so it costs nothing until the user asks for it.
    const infoStrings = stringManager.getInfoStrings();
    let infoDialog: Dialog | null = null;
    const infoButton = new InfoButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      // InfoButton renders larger than Reset All by default; shrink it to sit
      // comfortably beside it (~40% smaller).
      scale: 0.6,
      accessibleName: a11y.controls.infoButtonStringProperty,
      listener: () => {
        if (infoDialog === null) {
          infoDialog = new Dialog(new ZenithInfoDialogContent(), {
            title: new Text(infoStrings.titleStringProperty, {
              font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
              fill: LIGHT_SURFACE_TEXT_FILL,
            }),
          });
        }
        infoDialog.show();
      },
    });
    this.addChild(infoButton);

    const updateChromeLayout = (): void => {
      const visibleBounds = this.visibleBoundsProperty.value;

      // The sky is drawn full-bleed to visibleBounds, which extends behind the
      // navigation bar; layoutBounds.maxY is the bottom of the always-visible play
      // area above it, so bottom-anchored chrome uses that to avoid being occluded.
      const safeBottom = Math.min(visibleBounds.maxY, this.layoutBounds.maxY);

      // Left column, top to bottom: Location panel, Time panel.
      this.locationPanel.left = visibleBounds.minX + SCREEN_VIEW_MARGIN;
      this.locationPanel.top = visibleBounds.minY + SCREEN_VIEW_MARGIN;

      this.timePanel.left = visibleBounds.minX + SCREEN_VIEW_MARGIN;
      this.timePanel.top = this.locationPanel.bottom + RESET_ALL_PANEL_GAP;

      // Right column, top to bottom: Display panel, Reset All.
      this.controlPanel.right = visibleBounds.maxX - SCREEN_VIEW_MARGIN;
      this.controlPanel.top = visibleBounds.minY + SCREEN_VIEW_MARGIN;

      // Name search floats at top-center (grows downward as the user types).
      this.searchNode.centerX = visibleBounds.centerX;
      this.searchNode.top = visibleBounds.minY + SCREEN_VIEW_MARGIN;

      // Selection readout: bottom-left over the sky. The left column (Location +
      // Time) can reach the bottom of the window at common sizes, which would
      // leave the readout painted over by the Time panel — so when they would
      // overlap, slide it clear to the right of that column instead.
      //
      // `left` is computed once and assigned once: this runs re-entrantly from
      // selectionPanel.boundsProperty, so writing it twice (default, then the
      // shifted value) would notify back into here forever. Anchoring `bottom`
      // first is safe — the overlap test reads `top`, which depends on `bottom`
      // and the panel height, never on `left`.
      selectionPanel.bottom = safeBottom - SELECTION_PANEL_BOTTOM_CLEARANCE;
      const selectionClearsLeftColumn = selectionPanel.top >= this.timePanel.bottom + RESET_ALL_PANEL_GAP;
      selectionPanel.left = selectionClearsLeftColumn
        ? visibleBounds.minX + SELECTION_PANEL_INSET
        : Math.min(
            this.timePanel.right + RESET_ALL_PANEL_GAP,
            visibleBounds.maxX - SELECTION_PANEL_INSET - selectionPanel.width,
          );

      resetAllButton.right = visibleBounds.maxX - SCREEN_VIEW_MARGIN;
      resetAllButton.bottom = safeBottom - SCREEN_VIEW_MARGIN;
      if (resetAllButton.top < this.controlPanel.bottom + RESET_ALL_PANEL_GAP) {
        resetAllButton.top = this.controlPanel.bottom + RESET_ALL_PANEL_GAP;
      }

      // Info button sits just to the left of Reset All, vertically centered on it.
      infoButton.right = resetAllButton.left - RESET_ALL_PANEL_GAP;
      infoButton.centerY = resetAllButton.centerY;

      onscreenHint.centerX = visibleBounds.centerX;
      onscreenHint.bottom = safeBottom - SELECTION_PANEL_INSET;
    };

    // Sky + background always fill the window (including past layoutBounds).
    const onVisibleBounds = (visibleBounds: Bounds2): void => {
      backgroundRect.setRectBounds(visibleBounds);
      this.skyNode.setViewBounds(visibleBounds);
      updateChromeLayout();
    };
    this.visibleBoundsProperty.link(onVisibleBounds);
    this.disposers.push(() => this.visibleBoundsProperty.unlink(onVisibleBounds));

    // Keep the stacked panels and Reset All clear when an accordion expands/collapses.
    this.locationPanel.boundsProperty.lazyLink(updateChromeLayout);
    this.timePanel.boundsProperty.lazyLink(updateChromeLayout);
    this.controlPanel.boundsProperty.lazyLink(updateChromeLayout);
    // The search overlay grows downward as results appear; keep it top-centered.
    this.searchNode.boundsProperty.lazyLink(updateChromeLayout);
    // Re-anchor the selection readout's bottom when its content grows (e.g. when
    // an object is selected and more rows appear) so it grows upward, not under
    // the navigation bar.
    selectionPanel.boundsProperty.lazyLink(updateChromeLayout);
    this.disposers.push(() => this.locationPanel.boundsProperty.unlink(updateChromeLayout));
    this.disposers.push(() => this.timePanel.boundsProperty.unlink(updateChromeLayout));
    this.disposers.push(() => this.controlPanel.boundsProperty.unlink(updateChromeLayout));
    this.disposers.push(() => this.searchNode.boundsProperty.unlink(updateChromeLayout));
    this.disposers.push(() => selectionPanel.boundsProperty.unlink(updateChromeLayout));

    // ── Accessibility: keyboard / reading traversal order ─────────────────────
    // AccordionBox owns PDOM order for its content; include the box as a whole.
    this.addChild(
      new Node({
        pdomOrder: [
          this.skyNode,
          this.searchNode,
          this.locationPanel,
          this.timePanel,
          this.controlPanel,
          infoButton,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    this.locationPanel.reset();
    this.timePanel.reset();
    this.controlPanel.reset();
  }

  /**
   * Detaches constructor-time links and tears down the sky node. Does not call
   * `super.dispose()` — joist `ScreenView` is intentionally non-disposable
   * (`isDisposable` is omitted from `ScreenViewOptions`, and its `setPDOMOrder`
   * override throws during ParallelDOM teardown). The subscription surface is
   * what fuzz / unit tests need released; the ScreenView shell is sim-lifetime.
   */
  public override dispose(): void {
    for (const dispose of this.disposers.splice(0)) {
      dispose();
    }
    this.skyNode.dispose();
    this.selectedReadout.dispose();
  }

  public override step(_dt: number): void {
    // Joist (Sim.stepSimulation) already steps the screen model each frame, just
    // before this view step — stepping it again here would advance civil time at
    // twice the intended rate. So the view step only flushes the pending sky
    // redraw once per frame, coalescing the several model property changes a
    // single model step produces into one redraw.
    this.skyNode.updateDirty();
  }
}
