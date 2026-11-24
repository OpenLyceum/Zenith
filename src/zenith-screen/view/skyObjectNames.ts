/** Live localized names for the fixed stars and constellation figure catalog. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { StringManager } from "../../i18n/StringManager.js";
import type { ConstellationId } from "../model/ConstellationLines.js";
import type { NamedStarId } from "../model/NamedBrightStars.js";

export function starNameProperty(id: NamedStarId): TReadOnlyProperty<string> {
  return StringManager.getInstance().getStars()[`${id}StringProperty`];
}

export function constellationNameProperty(id: ConstellationId): TReadOnlyProperty<string> {
  return StringManager.getInstance().getConstellations()[`${id}StringProperty`];
}
