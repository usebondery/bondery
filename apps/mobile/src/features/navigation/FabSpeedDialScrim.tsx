import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useMobileNavigationTranslations } from "@/lib/i18n/generated/hooks";
import { FAB_SPEED_DIAL_MOTION } from "../../theme/animations";
import { MOBILE_Z_INDEX } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

interface FabSpeedDialScrimProps {
  /** Height of the dimmed region — everything above the chrome pill. */
  height: number;
  onDismiss: () => void;
  visible: boolean;
}

export function FabSpeedDialScrim({ visible, height, onDismiss }: FabSpeedDialScrimProps) {
  const tMobileNavigation = useMobileNavigationTranslations();
  const colors = useMobileThemeColors();
  const opacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.value = withSpring(1, FAB_SPEED_DIAL_MOTION.openSpring);
      return;
    }

    if (!mounted) {
      return;
    }

    opacity.value = withTiming(
      0,
      { duration: FAB_SPEED_DIAL_MOTION.closeDurationMs },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      },
    );
  }, [mounted, opacity, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!mounted) {
    return null;
  }

  if (height <= 0) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={tMobileNavigation("CloseAddMenu")}
      accessibilityRole="button"
      onPress={onDismiss}
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.scrim, { height }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }, animatedStyle]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    elevation: MOBILE_Z_INDEX.fabScrim,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: MOBILE_Z_INDEX.fabScrim,
  },
});
