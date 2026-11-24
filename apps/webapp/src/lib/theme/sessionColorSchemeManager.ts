import type { MantineColorSchemeManager } from "@mantine/core";

/**
 * Mantine color scheme manager that does not persist to localStorage.
 * Account theme is owned by UserSession (DB); Mantine is render-only.
 */
export function sessionColorSchemeManager(): MantineColorSchemeManager {
  return {
    clear: () => {
      // no-op: account theme is stored on UserSession, not in this manager
    },
    get: (defaultValue) => defaultValue,
    set: () => {
      // no-op: Mantine is render-only; theme writes go through UserSession
    },
    subscribe: () => {
      // no-op: session theme changes arrive through React props, not this manager
    },
    unsubscribe: () => {
      // no-op: this manager never registers a listener
    },
  };
}
