import { useCallback, useEffect, useRef } from "react";

const DEFAULT_DELAY_MS = 280;

/**
 * Distinguishes single vs double tap on the same target.
 * Single fires after a short delay; a second tap within the window cancels it and fires double.
 */
export function useSingleDoubleTap({
  onSinglePress,
  onDoublePress,
  delayMs = DEFAULT_DELAY_MS,
  enabled = true,
}: {
  onSinglePress: () => void;
  onDoublePress?: () => void;
  delayMs?: number;
  enabled?: boolean;
}) {
  const singlePressRef = useRef(onSinglePress);
  const doublePressRef = useRef(onDoublePress);
  const lastPressAtRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    singlePressRef.current = onSinglePress;
    doublePressRef.current = onDoublePress;
  }, [onSinglePress, onDoublePress]);

  useEffect(
    () => () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
    },
    [],
  );

  return useCallback(() => {
    if (!enabled) {
      singlePressRef.current();
      return;
    }

    const now = Date.now();
    const isDoubleTap = now - lastPressAtRef.current <= delayMs;

    if (isDoubleTap && doublePressRef.current) {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }

      lastPressAtRef.current = 0;
      doublePressRef.current();
      return;
    }

    lastPressAtRef.current = now;

    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
    }

    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      singlePressRef.current();
    }, delayMs);
  }, [delayMs, enabled]);
}
