import { createTamagui } from "@tamagui/core";
import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";

/**
 * Global press shrink scale.
 * Change this single value to adjust the press-depth effect on all ScalePressable buttons.
 */
export const PRESS_SCALE = 0.96;

const animations = createAnimations({
  /** Fast spring used for press/release scale transitions */
  quick: {
    type: "spring",
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    type: "spring",
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
});

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  animations,
});

export type AppTamaguiConfig = typeof tamaguiConfig;

export default tamaguiConfig;
