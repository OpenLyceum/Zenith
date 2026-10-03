/**
 * ZenithKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 * Planetarium rows come from ZenithHotkeyData so icons stay in sync with
 * attachPlanetariumInteraction. Shortcuts are grouped into four sections:
 * Movement, Selection & zoom, Time, and Display options.
 */

import {
  ArrowKeyNode,
  BasicActionsKeyboardHelpSection,
  ComboBoxKeyboardHelpSection,
  KeyboardHelpIconFactory,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  LetterKeyNode,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TextKeyNode,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import ZenithHotkeyData from "../../common/ZenithHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";

/**
 * SceneryStack's KeyboardHelpIconFactory.fromHotkeyData has no `ctrl` entry in
 * ENGLISH_KEY_TO_KEY_NODE (only shift/alt), so Ctrl+arrow hotkeys need a hand-built icon.
 */
function ctrlLeftRightArrowIcon() {
  const ctrlKey = () => new TextKeyNode("Ctrl");
  return KeyboardHelpIconFactory.iconOrIcon(
    KeyboardHelpIconFactory.iconPlusIcon(ctrlKey(), new ArrowKeyNode("left")),
    KeyboardHelpIconFactory.iconPlusIcon(ctrlKey(), new ArrowKeyNode("right")),
  );
}

/** Shift held together with a single key, e.g. Shift + N. */
function shiftPlusIcon(keyLabel: string) {
  return KeyboardHelpIconFactory.iconPlusIcon(TextKeyNode.shift(), new LetterKeyNode(keyLabel));
}

export class ZenithKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const kb = StringManager.getInstance().getKeyboardHelpStrings();

    // ── Movement ──────────────────────────────────────────────────────────────
    const movementSection = new KeyboardHelpSection(kb.movementStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.LOOK_PAN, {
        labelStringProperty: kb.lookPanStringProperty,
        pdomLabelStringProperty: kb.lookPanDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.LOOK_NORTH, {
        labelStringProperty: kb.lookNorthStringProperty,
        pdomLabelStringProperty: kb.lookNorthDescriptionStringProperty,
        icon: shiftPlusIcon("N"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.LOOK_SOUTH, {
        labelStringProperty: kb.lookSouthStringProperty,
        pdomLabelStringProperty: kb.lookSouthDescriptionStringProperty,
        icon: shiftPlusIcon("S"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.LOOK_EAST, {
        labelStringProperty: kb.lookEastStringProperty,
        pdomLabelStringProperty: kb.lookEastDescriptionStringProperty,
        icon: shiftPlusIcon("E"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.LOOK_WEST, {
        labelStringProperty: kb.lookWestStringProperty,
        pdomLabelStringProperty: kb.lookWestDescriptionStringProperty,
        icon: shiftPlusIcon("W"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.LOOK_ZENITH, {
        labelStringProperty: kb.lookZenithStringProperty,
        pdomLabelStringProperty: kb.lookZenithDescriptionStringProperty,
        icon: shiftPlusIcon("Z"),
      }),
    ]);

    // ── Selection & zoom ──────────────────────────────────────────────────────
    const plusMinusIcon = KeyboardHelpIconFactory.iconOrIcon(new TextKeyNode("+"), new TextKeyNode("\u2212"));
    const selectionZoomSection = new KeyboardHelpSection(kb.selectionZoomStringProperty, [
      KeyboardHelpSectionRow.labelWithIcon(kb.zoomStringProperty, plusMinusIcon, {
        labelInnerContent: kb.zoomDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.SELECT_NEXT, {
        labelStringProperty: kb.selectNextStringProperty,
        pdomLabelStringProperty: kb.selectNextDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.SELECT_PREVIOUS, {
        labelStringProperty: kb.selectPreviousStringProperty,
        pdomLabelStringProperty: kb.selectPreviousDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.CLEAR_SELECTION, {
        labelStringProperty: kb.clearSelectionStringProperty,
        pdomLabelStringProperty: kb.clearSelectionDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TRACK_OBJECT, {
        labelStringProperty: kb.trackObjectStringProperty,
        pdomLabelStringProperty: kb.trackObjectDescriptionStringProperty,
        icon: new LetterKeyNode("T"),
      }),
    ]);

    // ── Time ──────────────────────────────────────────────────────────────────
    const dayForwardIcon = KeyboardHelpIconFactory.iconPlusIcon(TextKeyNode.shift(), new TextKeyNode("+"));
    const dayBackwardIcon = KeyboardHelpIconFactory.iconPlusIcon(TextKeyNode.shift(), new TextKeyNode("\u2212"));
    const timeSection = new KeyboardHelpSection(kb.timeStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.ADVANCE_CIVIL_TIME, {
        labelStringProperty: kb.advanceCivilTimeStringProperty,
        pdomLabelStringProperty: kb.advanceCivilTimeDescriptionStringProperty,
        icon: ctrlLeftRightArrowIcon(),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TIME_SLOWER, {
        labelStringProperty: kb.timeSlowerStringProperty,
        pdomLabelStringProperty: kb.timeSlowerDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TIME_NORMAL, {
        labelStringProperty: kb.timeNormalStringProperty,
        pdomLabelStringProperty: kb.timeNormalDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TIME_FASTER, {
        labelStringProperty: kb.timeFasterStringProperty,
        pdomLabelStringProperty: kb.timeFasterDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TIME_DAY_FORWARD, {
        labelStringProperty: kb.timeDayForwardStringProperty,
        pdomLabelStringProperty: kb.timeDayForwardDescriptionStringProperty,
        icon: dayForwardIcon,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TIME_DAY_BACKWARD, {
        labelStringProperty: kb.timeDayBackwardStringProperty,
        pdomLabelStringProperty: kb.timeDayBackwardDescriptionStringProperty,
        icon: dayBackwardIcon,
      }),
    ]);

    // ── Display options ───────────────────────────────────────────────────────
    const displaySection = new KeyboardHelpSection(kb.displayStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TOGGLE_ATMOSPHERE, {
        labelStringProperty: kb.toggleAtmosphereStringProperty,
        pdomLabelStringProperty: kb.toggleAtmosphereDescriptionStringProperty,
        icon: new LetterKeyNode("A"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TOGGLE_HORIZON, {
        labelStringProperty: kb.toggleHorizonStringProperty,
        pdomLabelStringProperty: kb.toggleHorizonDescriptionStringProperty,
        icon: new LetterKeyNode("G"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TOGGLE_CARDINALS, {
        labelStringProperty: kb.toggleCardinalsStringProperty,
        pdomLabelStringProperty: kb.toggleCardinalsDescriptionStringProperty,
        icon: new LetterKeyNode("Q"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TOGGLE_GRID, {
        labelStringProperty: kb.toggleGridStringProperty,
        pdomLabelStringProperty: kb.toggleGridDescriptionStringProperty,
        icon: new LetterKeyNode("Z"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TOGGLE_EQUATORIAL_GRID, {
        labelStringProperty: kb.toggleEquatorialGridStringProperty,
        pdomLabelStringProperty: kb.toggleEquatorialGridDescriptionStringProperty,
        icon: new LetterKeyNode("E"),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.TOGGLE_MERIDIAN, {
        labelStringProperty: kb.toggleMeridianStringProperty,
        pdomLabelStringProperty: kb.toggleMeridianDescriptionStringProperty,
        icon: new LetterKeyNode("M"),
      }),
    ]);

    super(
      [
        movementSection,
        new MoveDraggableItemsKeyboardHelpSection(),
        timeSection,
        new BasicActionsKeyboardHelpSection(),
      ],
      [
        selectionZoomSection,
        displaySection,
        new SliderControlsKeyboardHelpSection(),
        new ComboBoxKeyboardHelpSection(),
        new TimeControlsKeyboardHelpSection(),
      ],
    );
  }
}
