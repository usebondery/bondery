import { useEffect } from "react";
import { AndroidSoftInputModes, KeyboardController } from "react-native-keyboard-controller";

/**
 * Keeps Android soft-input mode on adjustResize for the app lifetime.
 * Manifest already sets adjustResize; this ensures runtime consistency per
 * keyboard-controller docs without toggling per sheet mount.
 */
export function useAndroidKeyboardResizeMode() {
  useEffect(() => {
    KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE);

    return () => {
      KeyboardController.setDefaultMode();
    };
  }, []);
}
