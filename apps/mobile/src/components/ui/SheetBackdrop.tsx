import { type BottomSheetBackdropProps, useBottomSheet } from "@gorhom/bottom-sheet";
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

  function handlePress() {
    if (pressBehavior === "close") {
      close();
    }
  }

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handlePress)();
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolation.CLAMP),
  }));

  const containerStyle = [
    StyleSheet.absoluteFill,
    { backgroundColor: overlayColor },
    style,
    animatedStyle,
  ];

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
