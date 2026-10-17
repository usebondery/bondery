/** Space between pill buttons and inner rail padding. */
export const FLOATING_PILL_SPACE = 10;

/** Dock side padding. */
export const FLOATING_DOCK_SPACE = 16;

/** Extra gap under the pill, added on top of the system inset. */
export const FLOATING_DOCK_BOTTOM = 24;

import { ACTION_BUTTON_SIZE_MD_PX } from "../ui/actionButtonTokens";

/** Pill button size; matches ActionButton `md`. */
export const FLOATING_PILL_BUTTON_SIZE = ACTION_BUTTON_SIZE_MD_PX;

export function getFloatingChromePillHeight(): number {
  return FLOATING_PILL_BUTTON_SIZE + 2 * FLOATING_PILL_SPACE;
}

export function getFloatingChromeSafePadding(insetBottom: number): number {
  return insetBottom + FLOATING_DOCK_BOTTOM;
}
