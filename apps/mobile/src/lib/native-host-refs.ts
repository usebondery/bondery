import type { ComponentRef } from "react";
import type { TextInput, View } from "react-native";

/** Host instance for `TextInput` (the component type is not the ref). */
export type NativeTextInputRef = ComponentRef<typeof TextInput>;

/** Host instance for `View` (the component type is not the ref). */
export type NativeViewRef = ComponentRef<typeof View>;
