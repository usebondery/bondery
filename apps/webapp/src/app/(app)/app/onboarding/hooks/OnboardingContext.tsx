"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type OnboardingIntent = "personal" | "professional" | "both" | null;

interface OnboardingContextValue {
  intent: OnboardingIntent;
  setIntent: (intent: OnboardingIntent) => void;
}

const OnboardingCtx = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [intent, setIntentState] = useState<OnboardingIntent>(null);

  const setIntent = useCallback((value: OnboardingIntent) => {
    setIntentState(value);
  }, []);

  const value = useMemo(() => ({ intent, setIntent }), [intent, setIntent]);

  return <OnboardingCtx.Provider value={value}>{children}</OnboardingCtx.Provider>;
}

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) {
    throw new Error("useOnboardingContext must be used within OnboardingProvider");
  }
  return ctx;
}
