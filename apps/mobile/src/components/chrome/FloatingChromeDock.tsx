import { forwardRef, type ReactNode } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeViewRef } from "../../lib/native-host-refs";
import { FLOATING_DOCK_SPACE, getFloatingChromeSafePadding } from "./floatingChromeTokens";

interface FloatingChromeDockProps {
  children: ReactNode;
  elevation?: number;
  /** When true, the measure host spans the dock content width (for tab bar + side FAB). */
  hostFullWidth?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  zIndex?: number;
}

/**
 * Bottom overlay dock for floating pill chrome.
 * `onLayout` and `ref` attach to the pill host, not the padded dock.
 */
export const FloatingChromeDock = forwardRef<NativeViewRef, FloatingChromeDockProps>(
  function FloatingChromeDock(
    { children, elevation, hostFullWidth = false, onLayout, zIndex },
    forwardedRef,
  ) {
    const insets = useSafeAreaInsets();

    return (
      <View
        pointerEvents="box-none"
        style={{
          bottom: 0,
          elevation,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
          zIndex,
        }}
      >
        <View
          className="flex-1 items-center justify-end"
          pointerEvents="box-none"
          style={{
            paddingBottom: getFloatingChromeSafePadding(insets.bottom),
            paddingHorizontal: FLOATING_DOCK_SPACE,
          }}
        >
          <View
            collapsable={false}
            onLayout={onLayout}
            pointerEvents="box-none"
            ref={forwardedRef}
            style={
              hostFullWidth
                ? { alignSelf: "stretch", width: "100%" }
                : { alignItems: "center", alignSelf: "center" }
            }
          >
            {children}
          </View>
        </View>
      </View>
    );
  },
);
