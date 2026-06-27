declare module "react-native-imask" {
  import type { ComponentType, Ref } from "react";
  import type { TextInput, TextInputProps } from "react-native";

  export interface IMaskTextInputProps extends Omit<TextInputProps, "onChange" | "onChangeText" | "value"> {
    mask: string | RegExp | Array<string | RegExp>;
    unmask?: boolean;
    value?: string;
    onAccept?: (value: string, maskRef: unknown) => void;
    inputRef?: (maskedRef: { input: TextInput | null }) => void;
  }

  export const IMaskTextInput: ComponentType<IMaskTextInputProps>;
}
