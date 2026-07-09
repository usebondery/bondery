import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

export type FloatingActionBarSlot = "contacts-selection" | null;

interface FloatingChromeContextValue {
  actionBarSlot: FloatingActionBarSlot;
  clearActionBarSlot: () => void;
  setActionBarSlot: (slot: FloatingActionBarSlot) => void;
}

const FloatingChromeContext = createContext<FloatingChromeContextValue | null>(null);

export function FloatingChromeProvider({ children }: { children: ReactNode }) {
  const [actionBarSlot, setActionBarSlotState] = useState<FloatingActionBarSlot>(null);

  const setActionBarSlot = useCallback((slot: FloatingActionBarSlot) => {
    setActionBarSlotState(slot);
  }, []);

  const clearActionBarSlot = useCallback(() => {
    setActionBarSlotState(null);
  }, []);

  const value = useMemo(
    () => ({
      actionBarSlot,
      clearActionBarSlot,
      setActionBarSlot,
    }),
    [actionBarSlot, clearActionBarSlot, setActionBarSlot],
  );

  return <FloatingChromeContext.Provider value={value}>{children}</FloatingChromeContext.Provider>;
}

export function useFloatingChrome() {
  const context = useContext(FloatingChromeContext);

  if (!context) {
    throw new Error("useFloatingChrome must be used within FloatingChromeProvider");
  }

  return context;
}
