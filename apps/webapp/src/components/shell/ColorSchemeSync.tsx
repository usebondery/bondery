// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import { useMantineColorScheme } from "@mantine/core";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useUserSession } from "@/components/shell/UserSessionProvider";
import { MANTINE_COLOR_SCHEME_STORAGE_KEY } from "@/lib/theme/constants";

/**
 * Applies UserSession.colorScheme to Mantine (one-way).
 *
 * Source of truth: user_settings.color_scheme → getAppSession() → UserSessionProvider.
 * Do not call setColorScheme elsewhere; theme field saves use applyUserSession({ colorScheme }).
 */
export function ColorSchemeSync() {
  const { colorScheme } = useUserSession();
  const { setColorScheme } = useMantineColorScheme();
  const setColorSchemeRef = useRef(setColorScheme);
  setColorSchemeRef.current = setColorScheme;

  useLayoutEffect(() => {
    try {
      window.localStorage.removeItem(MANTINE_COLOR_SCHEME_STORAGE_KEY);
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, []);

  useEffect(() => {
    setColorSchemeRef.current(colorScheme);
  }, [colorScheme]);

  return null;
}
