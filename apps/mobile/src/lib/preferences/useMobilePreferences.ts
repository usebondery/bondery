import { create } from "zustand";

export type SwipeAction = "call" | "message";
export type MobileLocale = "en" | "cs";

export interface MobilePreferencesState {
  locale: MobileLocale;
  leftSwipeAction: SwipeAction;
  rightSwipeAction: SwipeAction;
  setLocale: (locale: MobileLocale) => void;
  setLeftSwipeAction: (action: SwipeAction) => void;
  setRightSwipeAction: (action: SwipeAction) => void;
}

export const useMobilePreferences = create<MobilePreferencesState>(
  (set: (partial: Partial<MobilePreferencesState>) => void) => ({
    locale: "en",
    leftSwipeAction: "message",
    rightSwipeAction: "call",
    setLocale: (locale: MobileLocale) => set({ locale }),
    setLeftSwipeAction: (leftSwipeAction: SwipeAction) => set({ leftSwipeAction }),
    setRightSwipeAction: (rightSwipeAction: SwipeAction) => set({ rightSwipeAction }),
  }),
);
