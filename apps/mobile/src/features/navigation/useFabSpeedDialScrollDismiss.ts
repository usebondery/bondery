import { useCallback } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFabSpeedDial } from "./fabSpeedDialContext";

export function useFabSpeedDialScrollDismiss() {
  const { notifyScrolled } = useFabSpeedDial();

  const onScroll = useCallback(
    (_event?: NativeSyntheticEvent<NativeScrollEvent>) => {
      notifyScrolled();
    },
    [notifyScrolled],
  );

  return { onScroll };
}
