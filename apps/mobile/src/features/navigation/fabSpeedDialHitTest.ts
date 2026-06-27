import { FAB_GESTURE } from "../../lib/config";
import { MOBILE_HIT_SLOP } from "../../theme/tokens";
import type { FabSpeedDialMenuItemLayout } from "./fabSpeedDialTypes";

function resolveFabActionAtPoint(
  layouts: FabSpeedDialMenuItemLayout[],
  x: number,
  y: number,
  hitSlop: number,
  bridgePx: number,
): string | null {
  for (const layout of layouts) {
    const left = layout.x - hitSlop;
    const right = layout.x + layout.width + hitSlop;
    const top = layout.y - hitSlop - bridgePx;
    const bottom = layout.y + layout.height + hitSlop + bridgePx;

    if (x >= left && x <= right && y >= top && y <= bottom) {
      return layout.id;
    }
  }

  return null;
}

export function resolveFabHighlightedActionId(
  layouts: FabSpeedDialMenuItemLayout[],
  x: number,
  y: number,
): string | null {
  return resolveFabActionAtPoint(
    layouts,
    x,
    y,
    MOBILE_HIT_SLOP.nav,
    FAB_GESTURE.itemBridgePx,
  );
}
