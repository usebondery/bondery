import { createTamagui } from "@tamagui/core";
import { defaultConfig } from "@tamagui/config/v4";

const tamaguiConfig = createTamagui(defaultConfig);

export type AppTamaguiConfig = typeof tamaguiConfig;

export default tamaguiConfig;
