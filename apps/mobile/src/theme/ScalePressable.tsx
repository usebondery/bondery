import { Stack, styled } from "@tamagui/core";
import { PRESS_SCALE } from "./tamagui.config";

/**
 * Drop-in pressable that scales down on press using the globally configured
 * PRESS_SCALE value from tamagui.config.ts.
 *
 * @example
 * <ScalePressable onPress={handlePress}>
 *   <View style={styles.actionIcon}>
 *     <IconPhone size={20} />
 *   </View>
 * </ScalePressable>
 */
export const ScalePressable = styled(Stack, {
  animation: "quick",
  pressStyle: { scale: PRESS_SCALE },
  cursor: "pointer",
});
