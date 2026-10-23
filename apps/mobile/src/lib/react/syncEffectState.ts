import { startTransition } from "react";

/** Schedule effect-driven setState updates for React Compiler compatibility. */
export function syncEffectState(update: () => void): void {
  startTransition(update);
}
