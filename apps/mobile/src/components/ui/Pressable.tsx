import { Pressable as GestureHandlerPressable } from "react-native-gesture-handler";
import { withUniwind } from "uniwind";

/** RNGH Pressable with Uniwind `className` support (core RN Pressable is CSS-transformed; RNGH is not). */
export const Pressable = withUniwind(GestureHandlerPressable);
