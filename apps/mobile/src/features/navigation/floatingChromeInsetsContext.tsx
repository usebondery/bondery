import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getFloatingChromePillHeight,
  getFloatingChromeSafePadding,
} from "../../components/chrome/floatingChromeTokens";

interface FloatingChromeInsetsContextValue {
  measuredBottomInset: number;
  setMeasuredBottomInset: (height: number) => void;
}

const FloatingChromeInsetsContext = createContext<FloatingChromeInsetsContextValue | null>(null);

export function FloatingChromeInsetsProvider({ children }: { children: ReactNode }) {
  const [measuredBottomInset, setMeasuredBottomInsetState] = useState(0);

  const setMeasuredBottomInset = useCallback((height: number) => {
    setMeasuredBottomInsetState((current) => (current === height ? current : height));
  }, []);

  const value = useMemo(
    () => ({
      measuredBottomInset,
      setMeasuredBottomInset,
    }),
    [measuredBottomInset, setMeasuredBottomInset],
  );

  return (
    <FloatingChromeInsetsContext.Provider value={value}>
      {children}
    </FloatingChromeInsetsContext.Provider>
  );
}

/** Height of the floating bottom chrome overlay (tab bar, FAB, or selection bar). */
export function useFloatingChromeBottomInset(): number {
  const context = useContext(FloatingChromeInsetsContext);
  const insets = useSafeAreaInsets();
  const fallback = getFloatingChromePillHeight() + getFloatingChromeSafePadding(insets.bottom);

  if (!context || context.measuredBottomInset <= 0) {
    return fallback;
  }

  return context.measuredBottomInset;
}

export function useReportFloatingChromeBottomInset(): (height: number) => void {
  const context = useContext(FloatingChromeInsetsContext);

  return useCallback(
    (height: number) => {
      context?.setMeasuredBottomInset(height);
    },
    [context],
  );
}
