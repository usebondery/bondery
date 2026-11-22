import { createContext, type ReactNode, useContext, useState } from "react";

type FloatingActionBarSlot = "contacts-selection" | null;

interface FloatingChromeContextValue {
  actionBarSlot: FloatingActionBarSlot;
  clearActionBarSlot: () => void;
  setActionBarSlot: (slot: FloatingActionBarSlot) => void;
}

const FloatingChromeContext = createContext<FloatingChromeContextValue | null>(null);

function FloatingChromeProvider({ children }: { children: ReactNode }) {
  const [actionBarSlot, setActionBarSlotState] = useState<FloatingActionBarSlot>(null);

  function setActionBarSlot(slot: FloatingActionBarSlot) {
    setActionBarSlotState(slot);
  }

  function clearActionBarSlot() {
    setActionBarSlotState(null);
  }

  const value = {
    actionBarSlot,
    clearActionBarSlot,
    setActionBarSlot,
  };

  return <FloatingChromeContext.Provider value={value}>{children}</FloatingChromeContext.Provider>;
}

function useFloatingChrome() {
  const context = useContext(FloatingChromeContext);

  if (!context) {
    throw new Error("useFloatingChrome must be used within FloatingChromeProvider");
  }

  return context;
}

export type { FloatingActionBarSlot };
export { FloatingChromeProvider, useFloatingChrome };
