import { type ReactNode, useEffect, useState } from "react";

type KeyboardModule = typeof import("react-native-keyboard-controller");

/**
 * Load keyboard-controller after the root layout has a default export.
 * That package calls `createAnimatedComponent` at module scope; a throw there
 * previously left expo-router with no `_layout` default export.
 */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  const [keyboardModule, setKeyboardModule] = useState<KeyboardModule | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("react-native-keyboard-controller")
      .then((mod) => {
        if (!cancelled) {
          setKeyboardModule(mod);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!keyboardModule) {
      return;
    }

    if (typeof keyboardModule.KeyboardController?.setInputMode === "function") {
      keyboardModule.KeyboardController.setInputMode(
        keyboardModule.AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE,
      );
    }

    return () => {
      if (typeof keyboardModule.KeyboardController?.setDefaultMode === "function") {
        keyboardModule.KeyboardController.setDefaultMode();
      }
    };
  }, [keyboardModule]);

  if (!keyboardModule || typeof keyboardModule.KeyboardProvider !== "function") {
    return children;
  }

  const { KeyboardProvider } = keyboardModule;

  return <KeyboardProvider preload={false}>{children}</KeyboardProvider>;
}
