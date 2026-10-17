import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { UI_TIMING_MS } from "../config";
import type { NativeTextInputRef } from "../native-host-refs";

/**
 * Focus a sheet field after Gorhom reports a visible snap index (`index >= 0`).
 * Pass the returned callback to `ui/Sheet` `onSnapIndexChange`.
 */
export function useSheetInputAutofocus(
  open: boolean,
  inputRef: RefObject<NativeTextInputRef | null>,
) {
  const pendingRef = useRef(false);

  useEffect(() => {
    if (open) {
      pendingRef.current = true;
    }
  }, [open]);

  return (index: number) => {
    if (index < 0 || !pendingRef.current) {
      return;
    }

    pendingRef.current = false;
    setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);
  };
}
