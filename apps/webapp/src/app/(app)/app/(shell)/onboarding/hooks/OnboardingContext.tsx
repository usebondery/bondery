"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

interface OnboardingContextValue {
  intent: OnboardingIntent;
  setIntent: (intent: OnboardingIntent) => void;
}

const OnboardingCtx = createContext<OnboardingContextValue | null>(null);

export type OnboardingIntent = "personal" | "professional" | "both" | null;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [intent, setIntentState] = useState<OnboardingIntent>(null);

  const setIntent = (nextIntent: OnboardingIntent) => {
    setIntentState(nextIntent);
  };

  const value = { intent, setIntent };

  return <OnboardingCtx.Provider value={value}>{children}</OnboardingCtx.Provider>;
}

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) {
    throw new Error("useOnboardingContext must be used within OnboardingProvider");
  }
  return ctx;
}
