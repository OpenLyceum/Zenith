/**
 * CivilDateTimeControl.ts
 *
 * Compact year / month / day / hour NumberControls that write
 * `civilTimeMsProperty` (which marks `epochPresetProperty` CUSTOM). Syncs from
 * civil time when presets play or scrub elsewhere.
 */

import { NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { GridBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import { civilPartsToTimeMs, civilTimeMsToParts, daysInUtcMonth } from "../../common/sky/civilDateTime.js";
import { ZENITH_COMPACT_SPINNER_NUMBER_CONTROL_OPTIONS } from "../../common/ZenithControlOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import ZenithColors from "../../ZenithColors.js";
import {
  CIVIL_DAY_RANGE,
  CIVIL_HOUR_RANGE,
  CIVIL_MONTH_RANGE,
  CIVIL_YEAR_RANGE,
  CONTROL_FONT_SIZE,
  CONTROL_PANEL_WIDTH,
  PANEL_CONTENT_SPACING,
} from "../../ZenithConstants.js";
import type { ZenithModel } from "../model/ZenithModel.js";

export class CivilDateTimeControl extends GridBox {
  private readonly disposers: (() => void)[] = [];

  public constructor(model: ZenithModel) {
    const controls = StringManager.getInstance().getControls();
    const a11y = StringManager.getInstance().getA11yStrings();

    const start = civilTimeMsToParts(model.civilTimeMsProperty.value);
    const yearProperty = new NumberProperty(start.year, { range: CIVIL_YEAR_RANGE });
    const monthProperty = new NumberProperty(start.month, { range: CIVIL_MONTH_RANGE });
    const dayProperty = new NumberProperty(start.day, { range: CIVIL_DAY_RANGE });
    const hourProperty = new NumberProperty(start.hour, { range: CIVIL_HOUR_RANGE });
    const dayEnabledRangeProperty = new Property(new Range(1, daysInUtcMonth(start.year, start.month)));

    let syncingFromCivil = false;
    let syncingToCivil = false;

    const pushPartsToCivil = (): void => {
      if (syncingFromCivil) {
        return;
      }
      syncingToCivil = true;
      model.civilTimeMsProperty.value = civilPartsToTimeMs({
        year: yearProperty.value,
        month: monthProperty.value,
        day: dayProperty.value,
        hour: hourProperty.value,
      });
      syncingToCivil = false;
    };

    const syncDayEnabledRange = (): void => {
      const maxDay = daysInUtcMonth(yearProperty.value, monthProperty.value);
      dayEnabledRangeProperty.value = new Range(1, maxDay);
      if (dayProperty.value > maxDay) {
        dayProperty.value = maxDay;
      }
    };

    const onYear = (): void => {
      syncDayEnabledRange();
      pushPartsToCivil();
    };
    const onMonth = (): void => {
      syncDayEnabledRange();
      pushPartsToCivil();
    };
    yearProperty.lazyLink(onYear);
    monthProperty.lazyLink(onMonth);
    dayProperty.lazyLink(pushPartsToCivil);
    hourProperty.lazyLink(pushPartsToCivil);

    const onCivilTime = (civilMs: number): void => {
      if (syncingToCivil) {
        return;
      }
      syncingFromCivil = true;
      const parts = civilTimeMsToParts(civilMs);
      yearProperty.value = parts.year;
      monthProperty.value = parts.month;
      dayProperty.value = parts.day;
      hourProperty.value = parts.hour;
      dayEnabledRangeProperty.value = new Range(1, daysInUtcMonth(parts.year, parts.month));
      syncingFromCivil = false;
    };
    model.civilTimeMsProperty.link(onCivilTime);

    const titleOptions = {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: ZenithColors.textColorProperty,
      maxWidth: 52,
    };

    const spinner = (
      titleProperty: typeof controls.yearStringProperty,
      numberProperty: NumberProperty,
      range: Range,
      accessibleName: typeof a11y.controls.yearStringProperty,
      extraOptions: { enabledRangeProperty?: Property<Range> } = {},
    ): NumberControl =>
      new NumberControl(titleProperty, numberProperty, range, {
        ...ZENITH_COMPACT_SPINNER_NUMBER_CONTROL_OPTIONS,
        delta: 1,
        numberDisplayOptions: {
          decimalPlaces: 0,
          maxWidth: 44,
        },
        titleNodeOptions: titleOptions,
        accessibleName,
        ...(extraOptions.enabledRangeProperty ? { enabledRangeProperty: extraOptions.enabledRangeProperty } : {}),
      });

    const yearControl = spinner(
      controls.yearStringProperty,
      yearProperty,
      CIVIL_YEAR_RANGE,
      a11y.controls.yearStringProperty,
    );
    const monthControl = spinner(
      controls.monthStringProperty,
      monthProperty,
      CIVIL_MONTH_RANGE,
      a11y.controls.monthStringProperty,
    );
    const dayControl = spinner(
      controls.dayStringProperty,
      dayProperty,
      CIVIL_DAY_RANGE,
      a11y.controls.dayStringProperty,
      {
        enabledRangeProperty: dayEnabledRangeProperty,
      },
    );
    const hourControl = spinner(
      controls.hourStringProperty,
      hourProperty,
      CIVIL_HOUR_RANGE,
      a11y.controls.hourStringProperty,
    );

    super({
      rows: [
        [yearControl, monthControl],
        [dayControl, hourControl],
      ],
      xSpacing: PANEL_CONTENT_SPACING,
      ySpacing: PANEL_CONTENT_SPACING,
      xAlign: "left",
      yAlign: "center",
      maxWidth: CONTROL_PANEL_WIDTH - 20,
    });

    this.disposers.push(() => {
      model.civilTimeMsProperty.unlink(onCivilTime);
      yearProperty.unlink(onYear);
      monthProperty.unlink(onMonth);
      dayProperty.unlink(pushPartsToCivil);
      hourProperty.unlink(pushPartsToCivil);
    });
    this.disposers.push(() => {
      yearProperty.dispose();
      monthProperty.dispose();
      dayProperty.dispose();
      hourProperty.dispose();
      dayEnabledRangeProperty.dispose();
    });
  }

  public override dispose(): void {
    const [detachListeners, disposeProperties] = this.disposers.splice(0);
    detachListeners?.();
    const children = this.children;
    super.dispose();
    for (const child of children) {
      child.disposeSubtree();
    }
    disposeProperties?.();
  }
}
