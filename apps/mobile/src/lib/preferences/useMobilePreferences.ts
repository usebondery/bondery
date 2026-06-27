import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18n from "../i18n/i18n";

export type SwipeAction = "call" | "message" | "email";
export type MobileLocale = "en" | "cs";
export type ThemePreference = "system" | "light" | "dark";
export type GroupSortOrder =
  | "recent-opened"
  | "count-desc"
  | "count-asc"
  | "alpha-asc"
  | "alpha-desc";

export type TagSortOrder = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

export interface MobilePreferencesState {
  locale: MobileLocale;
  leftSwipeAction: SwipeAction;
  rightSwipeAction: SwipeAction;
  themePreference: ThemePreference;
  groupSortOrder: GroupSortOrder;
  groupLastOpenedAt: Record<string, number>;
  tagSortOrder: TagSortOrder;
  setLocale: (locale: MobileLocale) => void;
  setLeftSwipeAction: (action: SwipeAction) => void;
  setRightSwipeAction: (action: SwipeAction) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  setGroupSortOrder: (order: GroupSortOrder) => void;
  setTagSortOrder: (order: TagSortOrder) => void;
  recordGroupOpened: (groupId: string) => void;
  hydrateFromServer: (data: {
    leftSwipeAction?: SwipeAction;
    rightSwipeAction?: SwipeAction;
    groupSortOrder?: GroupSortOrder;
    tagSortOrder?: TagSortOrder;
  }) => void;
}

export const useMobilePreferences = create<MobilePreferencesState>()(
  persist(
    (set: (partial: Partial<MobilePreferencesState> | ((state: MobilePreferencesState) => Partial<MobilePreferencesState>)) => void) => ({
      locale: "en",
      leftSwipeAction: "message",
      rightSwipeAction: "call",
      themePreference: "system",
      groupSortOrder: "count-desc",
      groupLastOpenedAt: {},
      tagSortOrder: "count-desc",
      setLocale: (locale: MobileLocale) =>
        set((state) => {
          if (state.locale === locale) {
            return state;
          }

          void i18n.changeLanguage(locale);
          return { locale };
        }),
      setLeftSwipeAction: (leftSwipeAction: SwipeAction) => set({ leftSwipeAction }),
      setRightSwipeAction: (rightSwipeAction: SwipeAction) => set({ rightSwipeAction }),
      setThemePreference: (themePreference: ThemePreference) => set({ themePreference }),
      setGroupSortOrder: (groupSortOrder: GroupSortOrder) => set({ groupSortOrder }),
      setTagSortOrder: (tagSortOrder: TagSortOrder) => set({ tagSortOrder }),
      recordGroupOpened: (groupId: string) =>
        set((state) => ({
          groupLastOpenedAt: {
            ...state.groupLastOpenedAt,
            [groupId]: Date.now(),
          },
        })),
      hydrateFromServer: (data) =>
        set((state) => ({
          leftSwipeAction: data.leftSwipeAction ?? state.leftSwipeAction,
          rightSwipeAction: data.rightSwipeAction ?? state.rightSwipeAction,
          groupSortOrder: data.groupSortOrder ?? state.groupSortOrder,
          tagSortOrder: data.tagSortOrder ?? state.tagSortOrder,
        })),
    }),
    {
      name: "mobile-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: MobilePreferencesState) => ({
        locale: state.locale,
        leftSwipeAction: state.leftSwipeAction,
        rightSwipeAction: state.rightSwipeAction,
        themePreference: state.themePreference,
        groupSortOrder: state.groupSortOrder,
        groupLastOpenedAt: state.groupLastOpenedAt,
        tagSortOrder: state.tagSortOrder,
      }),
    },
  ),
);
