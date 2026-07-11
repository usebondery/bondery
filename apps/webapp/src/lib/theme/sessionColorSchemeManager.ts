import type { MantineColorSchemeManager } from "@mantine/core";

/**
 * Mantine color scheme manager that does not persist to localStorage.
 * Account theme is owned by UserSession (DB); Mantine is render-only.
 */
export function sessionColorSchemeManager(): MantineColorSchemeManager {
  return {
    clear: () => {},
    get: (defaultValue) => defaultValue,
    set: () => {},
    subscribe: () => {},
    unsubscribe: () => {},
  };
}
