import type { ComponentProps } from "react";
import { Tappable } from "./Tappable";

/**
 * Backward-compatible alias to {@link Tappable}.
 * @deprecated Import `Tappable` in new code.
 */
export const SqueezePressable = Tappable;

export type SqueezePressableProps = ComponentProps<typeof Tappable>;
