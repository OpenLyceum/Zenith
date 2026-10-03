/**
 * TimeControlPanel.ts
 *
 * Dedicated "Time" accordion: date/time preset combo, year/month/day/hour jump
 * spinners, a "Now" button, ±1 sidereal-day jumps, and a playback-rate control
 * (decrease · play/pause · increase) whose rate ladder runs from fast-forward
 * through normal, across zero into reverse, on to fast-rewind. UTC / local-solar
 * / local-sidereal readouts round out the panel.
 */

import { BooleanProperty, DerivedProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { HBox, type Node, Path, Text, VBox } from "scenerystack/scenery";
import { PhetFont, PlayPauseButton } from "scenerystack/scenery-phet";
import { AccordionBox, ButtonNode, ComboBox, RectangularPushButton } from "scenerystack/sun";
import { formatLocalSolarTime } from "../../common/sky/civilDateTime.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  SIM_COMBO_BOX_OPTIONS,
} from "../../common/ZenithButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import ZenithColors from "../../ZenithColors.js";
import {
  CONTROL_FONT_SIZE,
  CONTROL_PANEL_WIDTH,
  HOURS_PER_SIDEREAL_DAY,
  PANEL_CONTENT_SPACING,
  PANEL_CORNER_RADIUS,
  PANEL_TITLE_FONT_SIZE,
  PANEL_X_MARGIN,
  PANEL_Y_MARGIN,
} from "../../ZenithConstants.js";
import { EpochPreset } from "../model/EpochPreset.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import { CivilDateTimeControl } from "./CivilDateTimeControl.js";

/** Formats civil time for the readout (UTC, minute precision). */
const formatCivilTimeUtc = (civilTimeMs: number): string =>
  new Date(civilTimeMs).toISOString().replace("T", " ").slice(0, 16);

/** Double-triangle glyph: points right for fast-forward, left (dir = -1) for rewind. */
const doubleTriangleShape = (dir: 1 | -1): Shape => {
  const w = 6;
  const h = 12;
  const shape = new Shape();
  for (const x of [0, dir * w]) {
    shape
      .moveTo(x, 0)
      .lineTo(x + dir * w, h / 2)
      .lineTo(x, h)
      .close();
  }
  return shape;
};

export class TimeControlPanel extends AccordionBox {
  private readonly disposeProperties: () => void;

  public constructor(model: ZenithModel, listParent: Node) {
    const stringManager = StringManager.getInstance();
    const controls = stringManager.getControls();
    const epochs = stringManager.getEpochs();
    const a11y = stringManager.getA11yStrings();

    const labelFont = new PhetFont(CONTROL_FONT_SIZE);
    const titleOptions = {
      font: labelFont,
      fill: ZenithColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH - 40,
    };
    const readoutText = (labelProperty: TReadOnlyProperty<string>): Text =>
      new Text(labelProperty, {
        font: labelFont,
        fill: ZenithColors.textColorProperty,
        maxWidth: CONTROL_PANEL_WIDTH - 40,
      });

    // ── Date / time preset combo ──────────────────────────────────────────────
    const comboItem = (labelProperty: typeof epochs.defaultStringProperty) => ({
      createNode: () =>
        new Text(labelProperty, {
          font: labelFont,
          fill: LIGHT_SURFACE_TEXT_FILL,
          maxWidth: CONTROL_PANEL_WIDTH - 50,
        }),
    });

    const epochCombo = new ComboBox(
      model.epochPresetProperty,
      [
        { value: EpochPreset.DEFAULT, ...comboItem(epochs.defaultStringProperty) },
        { value: EpochPreset.MARCH_EQUINOX, ...comboItem(epochs.marchEquinoxStringProperty) },
        { value: EpochPreset.JUNE_SOLSTICE, ...comboItem(epochs.juneSolsticeStringProperty) },
        { value: EpochPreset.SEPTEMBER_EQUINOX, ...comboItem(epochs.septemberEquinoxStringProperty) },
        { value: EpochPreset.DECEMBER_SOLSTICE, ...comboItem(epochs.decemberSolsticeStringProperty) },
        { value: EpochPreset.CUSTOM, ...comboItem(epochs.customStringProperty) },
      ],
      listParent,
      {
        ...SIM_COMBO_BOX_OPTIONS,
        accessibleName: a11y.controls.epochStringProperty,
      },
    );

    // ── Year / month / day / hour spinners ────────────────────────────────────
    const civilDateTimeControl = new CivilDateTimeControl(model);

    // ── "Now" + sidereal-day jumps ────────────────────────────────────────────
    const nowButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(controls.nowStringProperty, {
        font: labelFont,
        fill: LIGHT_SURFACE_TEXT_FILL,
      }),
      accessibleName: a11y.controls.nowStringProperty,
      listener: () => model.setToNow(),
    });

    const siderealButton = (
      labelProperty: typeof controls.siderealDayPlusStringProperty,
      accessibleName: typeof a11y.controls.siderealDayForwardStringProperty,
      siderealHours: number,
    ): RectangularPushButton =>
      new RectangularPushButton({
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        content: new Text(labelProperty, {
          font: labelFont,
          fill: LIGHT_SURFACE_TEXT_FILL,
          maxWidth: 40,
        }),
        accessibleName,
        listener: () => model.advanceSiderealTime(siderealHours),
      });

    const siderealRow = new HBox({
      spacing: 6,
      children: [
        new Text(controls.siderealDayStringProperty, titleOptions),
        siderealButton(
          controls.siderealDayMinusStringProperty,
          a11y.controls.siderealDayBackwardStringProperty,
          -HOURS_PER_SIDEREAL_DAY,
        ),
        siderealButton(
          controls.siderealDayPlusStringProperty,
          a11y.controls.siderealDayForwardStringProperty,
          HOURS_PER_SIDEREAL_DAY,
        ),
      ],
    });

    // ── Playback rate: decrease · play/pause · increase ───────────────────────
    const rateButton = (
      dir: 1 | -1,
      accessibleName: typeof a11y.controls.increaseTimeRateStringProperty,
      listener: () => void,
    ): RectangularPushButton =>
      new RectangularPushButton({
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        content: new Path(doubleTriangleShape(dir), { fill: LIGHT_SURFACE_TEXT_FILL }),
        xMargin: 8,
        yMargin: 6,
        accessibleName,
        listener,
      });

    const decreaseButton = rateButton(-1, a11y.controls.decreaseTimeRateStringProperty, () => model.decreaseTimeRate());
    const increaseButton = rateButton(1, a11y.controls.increaseTimeRateStringProperty, () => model.increaseTimeRate());
    const playPauseButton = new PlayPauseButton(model.timer.isPlayingProperty, {
      radius: 16,
      buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      startPlayingAccessibleName: a11y.controls.playPauseStartStringProperty,
      endPlayingAccessibleName: a11y.controls.playPauseEndStringProperty,
    });

    const rateControlRow = new HBox({
      spacing: 8,
      children: [decreaseButton, playPauseButton, increaseButton],
    });

    const rateStringProperty = new DerivedProperty([model.timeRateProperty], (rate) =>
      rate < 0 ? `−${Math.abs(rate)}` : `${rate}`,
    );
    const ratePatternProperty = new PatternStringProperty(controls.timeRateStringProperty, {
      rate: rateStringProperty,
    });
    const rateReadout = readoutText(ratePatternProperty);

    // ── Clock readouts ────────────────────────────────────────────────────────
    const civilTimeUtcProperty = new DerivedProperty([model.civilTimeMsProperty], formatCivilTimeUtc);
    const civilTimePatternProperty = new PatternStringProperty(controls.civilTimeStringProperty, {
      time: civilTimeUtcProperty,
    });
    const civilTimeReadout = readoutText(civilTimePatternProperty);

    const localSolarTimeProperty = new DerivedProperty(
      [model.civilTimeMsProperty, model.longitudeProperty],
      formatLocalSolarTime,
    );
    const localSolarTimePatternProperty = new PatternStringProperty(controls.localSolarTimeStringProperty, {
      time: localSolarTimeProperty,
    });
    const localSolarTimeReadout = readoutText(localSolarTimePatternProperty);

    const lstPatternProperty = new PatternStringProperty(
      controls.localSiderealTimeStringProperty,
      { hours: model.localSiderealTimeHoursProperty },
      { decimalPlaces: { hours: 2 } },
    );
    const lstReadout = readoutText(lstPatternProperty);

    const epochRow = new HBox({
      spacing: PANEL_CONTENT_SPACING,
      children: [epochCombo, nowButton],
    });

    const content = new VBox({
      spacing: PANEL_CONTENT_SPACING,
      align: "left",
      children: [
        epochRow,
        civilDateTimeControl,
        siderealRow,
        rateControlRow,
        rateReadout,
        civilTimeReadout,
        localSolarTimeReadout,
        lstReadout,
      ],
    });

    const panelTitle = new Text(controls.timePanelTitleStringProperty, {
      font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
      fill: ZenithColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH - 50,
    });

    super(content, {
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
        accessibleName: a11y.controls.timePanelStringProperty,
      },
      accessibleContextResponseExpanded: a11y.controls.timePanelExpandedStringProperty,
      accessibleContextResponseCollapsed: a11y.controls.timePanelCollapsedStringProperty,
      accessibleHelpTextExpanded: a11y.controls.timePanelHelpExpandedStringProperty,
      accessibleHelpTextCollapsed: a11y.controls.timePanelHelpCollapsedStringProperty,
    });

    this.disposeProperties = () => {
      ratePatternProperty.dispose();
      civilTimePatternProperty.dispose();
      localSolarTimePatternProperty.dispose();
      lstPatternProperty.dispose();
      rateStringProperty.dispose();
      civilTimeUtcProperty.dispose();
      localSolarTimeProperty.dispose();
    };
  }

  public override dispose(): void {
    if (this.isDisposed) {
      return;
    }
    const children = this.children;
    super.dispose();
    for (const child of children) {
      child.disposeSubtree();
    }
    this.disposeProperties();
  }
}
