/**
 * ObjectNameSearch.ts
 *
 * Type-ahead search box for named bright stars and solar-system bodies. Typing
 * filters the 47 named objects (38 stars + 9 bodies) by localized name or id;
 * Up/Down moves the highlight, Enter selects the match and enables tracking,
 * Escape clears. Clicking a row selects it too.
 *
 * Built from SceneryStack primitives (no DOM `<input>` in the bundled stack):
 * a focusable `div` peer carries a `KeyboardListener`, and the field/results are
 * ordinary canvas nodes themed via `ZenithColors`. Ranking logic lives in
 * `objectSearch.ts` so it can be unit-tested without Scenery.
 */

import { DerivedProperty, Multilink, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import type { OneKeyStroke } from "scenerystack/scenery";
import { Color, KeyboardListener, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { LIGHT_SURFACE_TEXT_FILL } from "../../common/ZenithButtonOptions.js";
import { ZenithPanel } from "../../common/ZenithPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import ZenithColors from "../../ZenithColors.js";
import { CONTROL_FONT_SIZE, PANEL_CONTENT_SPACING } from "../../ZenithConstants.js";
import { NAMED_BRIGHT_STARS } from "../model/NamedBrightStars.js";
import { rankObjects } from "../model/objectSearch.js";
import type { SelectedSkyObject } from "../model/SelectedSkyObject.js";
import { SOLAR_SYSTEM_BODIES } from "../model/SolarSystemBodies.js";
import type { ZenithModel } from "../model/ZenithModel.js";

/** Single-key strokes the field reacts to. Letters register both plain and
 *  Shifted so typing works regardless of Shift / Caps Lock state. */
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const TYPING_KEYS = [
  ...LETTERS,
  ...LETTERS.map((letter) => `shift+${letter}`),
  "backspace",
  "enter",
  "escape",
  "arrowUp",
  "arrowDown",
] as OneKeyStroke[];

const MAX_RESULTS = 8;
const FIELD_WIDTH = 224;
const FIELD_HEIGHT = 26;
const ROW_WIDTH = FIELD_WIDTH;
const ROW_HEIGHT = 20;

type Entry = {
  readonly selected: SelectedSkyObject;
  readonly nameProperty: TReadOnlyProperty<string>;
};

export class ObjectNameSearch extends Node {
  private readonly disposers: (() => void)[] = [];

  public constructor(model: ZenithModel) {
    const stringManager = StringManager.getInstance();
    const controls = stringManager.getControls();
    const a11y = stringManager.getA11yStrings();
    const bodies = stringManager.getBodies();
    const stars = stringManager.getStars();

    const entries: Entry[] = [
      ...NAMED_BRIGHT_STARS.map((star) => ({
        selected: {
          kind: "star",
          id: star.id,
          raHours: star.raHours,
          decDeg: star.decDeg,
          mag: star.mag,
        } satisfies SelectedSkyObject,
        nameProperty: stars[`${star.id}StringProperty` as keyof typeof stars] as TReadOnlyProperty<string>,
      })),
      ...SOLAR_SYSTEM_BODIES.map((body) => ({
        selected: { kind: "planet", id: body.id } satisfies SelectedSkyObject,
        nameProperty: bodies[`${body.id}StringProperty` as keyof typeof bodies] as TReadOnlyProperty<string>,
      })),
    ];

    const queryProperty = new Property("");
    const focusedProperty = new Property(false);
    const highlightIndexProperty = new Property(0);

    // Re-rank whenever the query changes. A locale swap re-reads names, so bump
    // a tick from any name property change (they all flip together on locale).
    const localeTickProperty = new Property(0);
    const localeListeners = entries.map((entry) => {
      const onNameChange = (): void => {
        localeTickProperty.value++;
      };
      entry.nameProperty.lazyLink(onNameChange);
      return () => entry.nameProperty.unlink(onNameChange);
    });
    const matchesProperty = new DerivedProperty([queryProperty, localeTickProperty], (query) => {
      const searchEntries = entries.map((entry) => ({ id: entry.selected.id, name: entry.nameProperty.value }));
      return rankObjects(query, searchEntries, MAX_RESULTS)
        .map((ranked) => entries.find((entry) => entry.selected.id === ranked.id))
        .filter((entry): entry is Entry => entry !== undefined);
    });

    const choose = (entry: Entry): void => {
      model.selectedObjectProperty.value = entry.selected;
      model.trackSelectedObjectProperty.value = true;
      // A one-shot announcement: fill in a plain string rather than allocating a
      // PatternStringProperty per selection that would never be disposed.
      this.addAccessibleResponse(
        StringUtils.fillIn(a11y.searchSelectedAndTrackingStringProperty.value, { name: entry.nameProperty.value }),
      );
      queryProperty.value = "";
      highlightIndexProperty.value = 0;
    };

    // Keep the highlight within range as the result set shrinks.
    const onMatches = (matches: Entry[]): void => {
      if (highlightIndexProperty.value > matches.length - 1) {
        highlightIndexProperty.value = Math.max(0, matches.length - 1);
      }
    };
    matchesProperty.link(onMatches);

    // ── Field ──────────────────────────────────────────────────────────────────
    const fieldFont = new PhetFont(CONTROL_FONT_SIZE);
    const fieldStrokeProperty = new DerivedProperty(
      [focusedProperty, ZenithColors.accentColorProperty, ZenithColors.panelBorderColorProperty],
      (isFocused, accent, border) => (isFocused ? accent : border),
    );
    const fieldRect = new Rectangle(0, 0, FIELD_WIDTH, FIELD_HEIGHT, {
      cornerRadius: 4,
      fill: ZenithColors.controlSurfaceColorProperty,
      stroke: fieldStrokeProperty,
      lineWidth: 1.5,
    });

    const fieldTextProperty = new DerivedProperty(
      [queryProperty, controls.searchPlaceholderStringProperty],
      (q, placeholder) => (q.length === 0 ? placeholder : q),
    );
    const fieldText = new Text(fieldTextProperty, {
      font: fieldFont,
      fill: LIGHT_SURFACE_TEXT_FILL,
      maxWidth: FIELD_WIDTH - 22,
    });
    fieldText.left = 10;
    fieldText.centerY = FIELD_HEIGHT / 2;
    fieldText.opacity = 0.5;
    const onQuery = (q: string): void => {
      fieldText.opacity = q.length === 0 ? 0.5 : 1;
    };
    queryProperty.lazyLink(onQuery);

    const caret = new Rectangle(0, 0, 1.5, FIELD_HEIGHT - 12, { fill: LIGHT_SURFACE_TEXT_FILL, cornerRadius: 0.75 });
    caret.visible = false;
    const positionCaret = (): void => {
      caret.left = fieldText.right + 2;
      caret.centerY = FIELD_HEIGHT / 2;
    };
    positionCaret();
    fieldText.boundsProperty.lazyLink(positionCaret);

    const fieldNode = new Node({ cursor: "text", children: [fieldRect, fieldText, caret] });

    // ── Result rows ─────────────────────────────────────────────────────────────
    const rowFont = new PhetFont(CONTROL_FONT_SIZE);
    // Result rows sit directly on the dark panel fill, not on the white field
    // surface, so they take the panel text color. Using LIGHT_SURFACE_TEXT_FILL
    // here (near-black on deep indigo) renders them at ~1:1 contrast. The
    // highlighted row inverts: dark text on the light accent fill.
    const createRow = (entry: Entry, active: boolean): Node => {
      const background = new Rectangle(0, 0, ROW_WIDTH, ROW_HEIGHT, {
        cornerRadius: 3,
        // Transparent (not null) so the whole row stays a pointer hit target.
        fill: active ? ZenithColors.accentColorProperty : Color.TRANSPARENT,
      });
      const label = new Text(entry.nameProperty, {
        font: rowFont,
        fill: active ? LIGHT_SURFACE_TEXT_FILL : ZenithColors.textColorProperty,
        maxWidth: ROW_WIDTH - 12,
      });
      label.left = 6;
      label.centerY = ROW_HEIGHT / 2;
      const row = new Node({ cursor: "pointer", children: [background, label] });
      row.addInputListener({ down: () => choose(entry) });
      return row;
    };

    const resultsBox = new VBox({ spacing: 1, align: "left" });
    const rowsMultilink = Multilink.multilink([matchesProperty, highlightIndexProperty], (matches, highlight) => {
      const oldRows = resultsBox.children;
      resultsBox.setChildren(matches.map((entry, i) => createRow(entry, i === highlight)));
      for (const row of oldRows) {
        row.disposeSubtree();
      }
    });

    // ── "No matches" line + list visibility ────────────────────────────────────
    // Also on the dark panel fill, not the white field — panel text color.
    const statusText = new Text(controls.searchNoMatchesStringProperty, {
      font: rowFont,
      fill: ZenithColors.textColorProperty,
      maxWidth: FIELD_WIDTH,
    });
    const statusMultilink = Multilink.multilink(
      [focusedProperty, queryProperty, matchesProperty],
      (isFocused, q, matches) => {
        resultsBox.visible = isFocused || q.length > 0;
        statusText.visible = isFocused && q.length > 0 && matches.length === 0;
      },
    );

    // Caret follows focus.
    const onFocus = (isFocused: boolean): void => {
      caret.visible = isFocused;
    };
    focusedProperty.lazyLink(onFocus);

    const panel = new ZenithPanel(
      new VBox({ spacing: PANEL_CONTENT_SPACING, align: "left", children: [fieldNode, resultsBox, statusText] }),
      {
        xMargin: 8,
        yMargin: 6,
      },
    );

    super({
      tagName: "div",
      focusable: true,
      accessibleName: controls.searchAccessibleNameStringProperty,
      accessibleHelpText: controls.searchAccessibleHelpStringProperty,
      children: [panel],
    });

    // A pointer press on the field focuses the box so mouse users can type; that
    // focus also reveals the browsable result list (rows show while focused).
    fieldNode.addInputListener({ down: () => this.focus() });

    this.addInputListener(
      new KeyboardListener({
        keys: TYPING_KEYS,
        fire: (_event, keysPressed) => {
          const matches = matchesProperty.value;
          if (keysPressed === "backspace") {
            queryProperty.value = queryProperty.value.slice(0, -1);
            highlightIndexProperty.value = 0;
          } else if (keysPressed === "escape") {
            queryProperty.value = "";
            highlightIndexProperty.value = 0;
          } else if (keysPressed === "enter") {
            const entry = matches[highlightIndexProperty.value];
            if (entry) {
              choose(entry);
            }
          } else if (keysPressed === "arrowUp") {
            if (matches.length > 0) {
              highlightIndexProperty.value = (highlightIndexProperty.value - 1 + matches.length) % matches.length;
            }
          } else if (keysPressed === "arrowDown") {
            if (matches.length > 0) {
              highlightIndexProperty.value = (highlightIndexProperty.value + 1) % matches.length;
            }
          } else {
            const letter = keysPressed.split("+").pop();
            if (letter && letter.length === 1) {
              queryProperty.value += letter;
              highlightIndexProperty.value = 0;
            }
          }
        },
        focus: () => {
          focusedProperty.value = true;
        },
        blur: () => {
          focusedProperty.value = false;
        },
      }),
    );

    this.disposers.push(() => {
      for (const unlink of localeListeners) {
        unlink();
      }
      matchesProperty.unlink(onMatches);
      queryProperty.unlink(onQuery);
      focusedProperty.unlink(onFocus);
      fieldText.boundsProperty.unlink(positionCaret);
      rowsMultilink.dispose();
      statusMultilink.dispose();
    });
    this.disposers.push(() => {
      fieldTextProperty.dispose();
      fieldStrokeProperty.dispose();
      matchesProperty.dispose();
      queryProperty.dispose();
      focusedProperty.dispose();
      highlightIndexProperty.dispose();
      localeTickProperty.dispose();
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
