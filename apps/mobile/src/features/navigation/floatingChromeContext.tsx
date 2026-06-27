import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FloatingActionBarSlot = "contacts-selection" | null;

interface FloatingChromeContextValue {
  actionBarSlot: FloatingActionBarSlot;
  setActionBarSlot: (slot: FloatingActionBarSlot) => void;
  clearActionBarSlot: () => void;
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
      setActionBarSlot,
      clearActionBarSlot,
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
