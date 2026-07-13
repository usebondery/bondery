declare module "react-native-imask" {
  import type { ComponentType } from "react";
  import type { TextInput, TextInputProps } from "react-native";

  export interface IMaskTextInputProps
    extends Omit<TextInputProps, "onChange" | "onChangeText" | "value"> {
    inputRef?: (maskedRef: { input: TextInput | null }) => void;
    mask: string | RegExp | Array<string | RegExp>;
    onAccept?: (value: string, maskRef: unknown) => void;
    unmask?: boolean;
    value?: string;
  }

  export const IMaskTextInput: ComponentType<IMaskTextInputProps>;
}
