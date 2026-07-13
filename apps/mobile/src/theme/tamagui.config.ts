import { createAnimations } from "@tamagui/animations-reanimated";
import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "@tamagui/core";
import { UI_TIMING_MS } from "../lib/config";
import {
  PRIMARY_BUTTON_BACKGROUND,
  PRIMARY_BUTTON_BACKGROUND_HOVER,
  PRIMARY_BUTTON_BACKGROUND_PRESS,
  PRIMARY_BUTTON_TEXT,
} from "./colors";

const animations = createAnimations({
  /** Softer spring — larger enter/exit motion */
  medium: {
    damping: 10,
    mass: 0.9,
    stiffness: 100,
    type: "spring",
  },
  /** Fast spring — press/release, popovers, opacity feedback */
  quick: {
    damping: 20,
    mass: 1.2,
    stiffness: 250,
    type: "spring",
  },
  /** Fixed duration — input-adjacent timing, subtle fades */
  timing200: {
    duration: UI_TIMING_MS.inputFocusTransition,
    type: "timing",
  },
});

const lightTheme = {
  ...defaultConfig.themes.light,
  primaryButtonBackground: PRIMARY_BUTTON_BACKGROUND,
  primaryButtonBackgroundHover: PRIMARY_BUTTON_BACKGROUND_HOVER,
  primaryButtonBackgroundPress: PRIMARY_BUTTON_BACKGROUND_PRESS,
  primaryButtonText: PRIMARY_BUTTON_TEXT,
};

const darkTheme = {
  ...defaultConfig.themes.dark,
  primaryButtonBackground: PRIMARY_BUTTON_BACKGROUND,
  primaryButtonBackgroundHover: PRIMARY_BUTTON_BACKGROUND_HOVER,
  primaryButtonBackgroundPress: PRIMARY_BUTTON_BACKGROUND_PRESS,
  primaryButtonText: PRIMARY_BUTTON_TEXT,
};

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  animations,
  themes: {
    ...defaultConfig.themes,
    dark: darkTheme,
    light: lightTheme,
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;

export default tamaguiConfig;
