/**
 * ZenithControlOptions.ts
 *
 * Shared sizing and layout for panel controls (sliders, checkboxes, NumberControls).
 *
 * Template-owned toolkit: each sim uses only some of these, so every export is tagged
 * `@public` to tell dead-code checkers (knip) that an unused one is not dead code.
 */

import { HBox, type Node } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import type { CheckboxOptions } from "scenerystack/sun";
import ZenithColors from "../ZenithColors.js";
import { CHECKBOX_BOX_WIDTH, NUMBER_CONTROL_SLIDER_TRACK_SIZE, SLIDER_THUMB_SIZE } from "../ZenithConstants.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "./ZenithButtonOptions.js";

/** Base NumberControl options; spread into each instance and add titleNodeOptions as needed. @public */
export const ZENITH_NUMBER_CONTROL_OPTIONS = {
  arrowButtonOptions: { ...FLAT_RECTANGULAR_BUTTON_OPTIONS, scale: 0.75 },
  layoutFunction: NumberControl.createLayoutFunction4({
    sliderPadding: 4,
    arrowButtonSpacing: 3,
    verticalSpacing: 4,
  }),
  sliderOptions: {
    trackSize: NUMBER_CONTROL_SLIDER_TRACK_SIZE,
    thumbSize: SLIDER_THUMB_SIZE,
    trackFillEnabled: ZenithColors.textColorProperty,
  },
};

/**
 * Compact NumberControl layout for civil year/month/day/hour: title + arrows +
 * readout only (slider is not placed, so the control stays short).
 */
export const ZENITH_COMPACT_SPINNER_NUMBER_CONTROL_OPTIONS = {
  arrowButtonOptions: { ...FLAT_RECTANGULAR_BUTTON_OPTIONS, scale: 0.65 },
  layoutFunction: (
    titleNode: Node,
    numberDisplay: Node,
    _slider: Node,
    decrementButton: Node | null,
    incrementButton: Node | null,
  ): Node => {
    const children: Node[] = [titleNode];
    if (decrementButton) {
      children.push(decrementButton);
    }
    children.push(numberDisplay);
    if (incrementButton) {
      children.push(incrementButton);
    }
    return new HBox({
      spacing: 3,
      align: "center",
      children,
    });
  },
  sliderOptions: {
    trackSize: NUMBER_CONTROL_SLIDER_TRACK_SIZE,
    thumbSize: SLIDER_THUMB_SIZE,
    visible: false,
    pickable: false,
  },
};

/** Themed checkbox chrome for dark panel backgrounds. @public */
export const ZENITH_CHECKBOX_OPTIONS = {
  boxWidth: CHECKBOX_BOX_WIDTH,
  spacing: 4,
  checkboxColor: ZenithColors.textColorProperty,
  checkboxColorBackground: ZenithColors.panelBackgroundColorProperty,
} satisfies CheckboxOptions;
