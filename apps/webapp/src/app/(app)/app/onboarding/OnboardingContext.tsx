"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

export type OnboardingIntent = "personal" | "professional" | "both" | null;

interface OnboardingContextValue {
  intent: OnboardingIntent;
  setIntent: (intent: OnboardingIntent) => void;
  seedPromise: Promise<void> | null;
  setSeedPromise: (p: Promise<void>) => void;
}

const OnboardingCtx = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [intent, setIntentState] = useState<OnboardingIntent>(null);
  const [seedPromise, setSeedPromise] = useState<Promise<void> | null>(null);

  const setIntent = useCallback((value: OnboardingIntent) => {
    setIntentState(value);
  }, []);

  const value = useMemo(
    () => ({ intent, setIntent, seedPromise, setSeedPromise }),
    [intent, setIntent, seedPromise],
  );

  return <OnboardingCtx.Provider value={value}>{children}</OnboardingCtx.Provider>;
}

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) {
    throw new Error("useOnboardingContext must be used within OnboardingProvider");
  }
  return ctx;
}
