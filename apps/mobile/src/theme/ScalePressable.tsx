import type { ComponentProps } from "react";
import { Tappable } from "./Tappable";

/**
 * Backward-compatible alias to {@link Tappable} with `variant="default"`.
 * @deprecated Import `Tappable` in new code.
 */
export function ScalePressable(props: ComponentProps<typeof Tappable>) {
  return <Tappable variant="default" {...props} />;
}
