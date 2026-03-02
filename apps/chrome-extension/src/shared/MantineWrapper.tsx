import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import { MantineProvider } from "@mantine/core";
import { bonderyTheme } from "@bondery/mantine-next/theme";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "../../../../packages/mantine-next/src/styles.css";

interface MantineWrapperProps {
  children: React.ReactNode;
}

interface ExtensionThemeContextValue {
  themePreference: "auto" | "light" | "dark";
  setThemePreference: (value: "auto" | "light" | "dark") => Promise<void>;
}

const THEME_STORAGE_KEY = "bondery_theme_preference";

const ExtensionThemeContext = createContext<ExtensionThemeContextValue | null>(null);

/**
 * Provides extension-wide Mantine theme preference with browser.storage persistence.
 */
export function useExtensionTheme() {
  const context = useContext(ExtensionThemeContext);
  if (!context) {
    throw new Error("useExtensionTheme must be used within MantineWrapper");
  }
  return context;
}

export function MantineWrapper({ children }: MantineWrapperProps) {
  const [themePreference, setThemePreferenceState] = useState<"auto" | "light" | "dark">("auto");
  const [systemColorScheme, setSystemColorScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystem = () => {
      setSystemColorScheme(mediaQuery.matches ? "dark" : "light");
    };

    applySystem();
    mediaQuery.addEventListener("change", applySystem);

    return () => {
      mediaQuery.removeEventListener("change", applySystem);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPreference() {
      try {
        const result = await browser.storage.local.get(THEME_STORAGE_KEY);
        const stored = result[THEME_STORAGE_KEY];

        if (mounted && (stored === "light" || stored === "dark" || stored === "auto")) {
          setThemePreferenceState(stored);
        }
      } catch (error) {
        console.error("[theme] Failed to load theme preference:", error);
      }
    }

    loadPreference();

    return () => {
      mounted = false;
    };
  }, []);

  const setThemePreference = async (value: "auto" | "light" | "dark") => {
    setThemePreferenceState(value);

    try {
      await browser.storage.local.set({ [THEME_STORAGE_KEY]: value });
    } catch (error) {
      console.error("[theme] Failed to save theme preference:", error);
    }
  };

  const contextValue = useMemo(
    () => ({
      themePreference,
      setThemePreference,
    }),
    [themePreference],
  );

  const resolvedColorScheme = themePreference === "auto" ? systemColorScheme : themePreference;

  return (
    <ExtensionThemeContext.Provider value={contextValue}>
      <MantineProvider theme={bonderyTheme} forceColorScheme={resolvedColorScheme}>
        {children}
      </MantineProvider>
    </ExtensionThemeContext.Provider>
  );
}
