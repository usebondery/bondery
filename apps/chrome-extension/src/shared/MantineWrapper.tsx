import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import { MantineProvider } from "@mantine/core";
import { bonderyTheme } from "@bondery/mantine-next/theme";

/**
 * CSS imports for Mantine / Bondery are NOT included here because content
 * scripts use `cssInjectionMode: "ui"` which auto-injects CSS into the
 * Shadow DOM. Popup / welcome pages that render outside a Shadow Root must
 * import the styles at their own entry-point level. See:
 *   - src/entrypoints/popup/main.tsx
 *   - src/entrypoints/welcome/main.tsx
 */

interface MantineWrapperProps {
  children: React.ReactNode;
  /** When rendering inside a Shadow DOM, pass the shadow host element so Mantine
   *  sets `data-mantine-color-scheme` on it — WXT transforms `:root` → `:host`
   *  in the bundled CSS, so the attribute must be on the shadow host for
   *  `:host([data-mantine-color-scheme])` selectors to match. */
  getRootElement?: () => HTMLElement;
  /** CSS selector for Mantine's variable style block. Pass `:host` when inside
   *  a shadow root so variables are scoped to the shadow host, consistent with
   *  WXT's `:root` → `:host` CSS transformation. */
  cssVariablesSelector?: string;
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

export function MantineWrapper({ children, getRootElement, cssVariablesSelector }: MantineWrapperProps) {
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
      <MantineProvider
        theme={bonderyTheme}
        forceColorScheme={resolvedColorScheme}
        {...(getRootElement ? { getRootElement } : {})}
        {...(cssVariablesSelector ? { cssVariablesSelector } : {})}
      >
        {children}
      </MantineProvider>
    </ExtensionThemeContext.Provider>
  );
}
