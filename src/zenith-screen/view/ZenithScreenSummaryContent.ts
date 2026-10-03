/**
 * ZenithScreenSummaryContent.ts
 *
 * Accessible screen summary with a live current-details paragraph over
 * latitude, look direction, LST, and play/pause state.
 */
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ZenithModel } from "../model/ZenithModel.js";

export class ZenithScreenSummaryContent extends ScreenSummaryContent {
  private readonly disposeProperties: () => void;

  public constructor(model: ZenithModel) {
    const a11y = StringManager.getInstance().getA11yStrings();

    const playStateProperty = new DerivedProperty(
      [model.timer.isPlayingProperty, a11y.playStatePlayingStringProperty, a11y.playStatePausedStringProperty],
      (isPlaying, playing, paused) => (isPlaying ? playing : paused),
    );

    const currentDetails = new PatternStringProperty(
      a11y.currentDetailsStringProperty,
      {
        latitude: model.latitudeProperty,
        azimuth: model.lookAzimuthDegProperty,
        altitude: model.lookAltitudeDegProperty,
        lst: model.localSiderealTimeHoursProperty,
        playState: playStateProperty,
      },
      { decimalPlaces: { latitude: 0, azimuth: 0, altitude: 0, lst: 1, playState: null } },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });

    this.disposeProperties = () => {
      currentDetails.dispose();
      playStateProperty.dispose();
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
