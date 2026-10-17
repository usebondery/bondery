import { type BottomSheetBackdropProps, useBottomSheet } from "@gorhom/bottom-sheet";
import { useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
} from "react-native-reanimated";

type SheetBackdropProps = BottomSheetBackdropProps & {
  accessibilityLabel: string;
  overlayColor: string;
  pressBehavior: "close" | "none";
};

/**
 * Themed sheet scrim. Fades with `animatedIndex` per Gorhom custom backdrop pattern.
 */
export function SheetBackdrop({
  animatedIndex,
  accessibilityLabel,
  overlayColor,
  pressBehavior,
  style,
}: SheetBackdropProps) {
  const { close } = useBottomSheet();

  const handlePress = useCallback(() => {
    if (pressBehavior === "close") {
      close();
    }
  }, [close, pressBehavior]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(handlePress)();
      }),
    [handlePress],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolation.CLAMP),
  }));

  const containerStyle = useMemo(
    () => [StyleSheet.absoluteFill, { backgroundColor: overlayColor }, style, animatedStyle],
    [animatedStyle, overlayColor, style],
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessible={pressBehavior === "close"}
        importantForAccessibility={pressBehavior === "close" ? "yes" : "no"}
        style={containerStyle}
      />
    </GestureDetector>
  );
}
