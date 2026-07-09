import type { SupportedLocale } from "@bondery/schemas/locale/supported-locale";
import { DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18n from "../i18n/i18n";

export type SwipeAction = "call" | "message" | "email";
export type MobileLocale = SupportedLocale;
export type ThemePreference = "system" | "light" | "dark";
export type GroupSortOrder =
  | "recent-opened"
  | "count-desc"
  | "count-asc"
  | "alpha-asc"
  | "alpha-desc";

export type TagSortOrder = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

export interface MobilePreferencesState {
  groupLastOpenedAt: Record<string, number>;
  groupSortOrder: GroupSortOrder;
  hydrateFromServer: (data: {
    leftSwipeAction?: SwipeAction;
    rightSwipeAction?: SwipeAction;
    groupSortOrder?: GroupSortOrder;
    tagSortOrder?: TagSortOrder;
  }) => void;
  leftSwipeAction: SwipeAction;
  locale: MobileLocale;
  recordGroupOpened: (groupId: string) => void;
  rightSwipeAction: SwipeAction;
  setGroupSortOrder: (order: GroupSortOrder) => void;
  setLeftSwipeAction: (action: SwipeAction) => void;
  setLocale: (locale: MobileLocale) => void;
  setRightSwipeAction: (action: SwipeAction) => void;
  setTagSortOrder: (order: TagSortOrder) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  tagSortOrder: TagSortOrder;
  themePreference: ThemePreference;
}

export const useMobilePreferences = create<MobilePreferencesState>()(
  persist(
    (
      set: (
        partial:
          | Partial<MobilePreferencesState>
          | ((state: MobilePreferencesState) => Partial<MobilePreferencesState>),
      ) => void,
    ) => ({
      groupLastOpenedAt: {},
      groupSortOrder: "count-desc",
      hydrateFromServer: (data) =>
        set((state) => ({
          groupSortOrder: data.groupSortOrder ?? state.groupSortOrder,
          leftSwipeAction: data.leftSwipeAction ?? state.leftSwipeAction,
          rightSwipeAction: data.rightSwipeAction ?? state.rightSwipeAction,
          tagSortOrder: data.tagSortOrder ?? state.tagSortOrder,
        })),
      leftSwipeAction: "message",
      locale: DEFAULT_LOCALE,
      recordGroupOpened: (groupId: string) =>
        set((state) => ({
          groupLastOpenedAt: {
            ...state.groupLastOpenedAt,
            [groupId]: Date.now(),
          },
        })),
      rightSwipeAction: "call",
      setGroupSortOrder: (groupSortOrder: GroupSortOrder) => set({ groupSortOrder }),
      setLeftSwipeAction: (leftSwipeAction: SwipeAction) => set({ leftSwipeAction }),
      setLocale: (locale: MobileLocale) =>
        set((state) => {
          if (state.locale === locale) {
            return state;
          }

          void i18n.changeLanguage(locale);
          return { locale };
        }),
      setRightSwipeAction: (rightSwipeAction: SwipeAction) => set({ rightSwipeAction }),
      setTagSortOrder: (tagSortOrder: TagSortOrder) => set({ tagSortOrder }),
      setThemePreference: (themePreference: ThemePreference) => set({ themePreference }),
      tagSortOrder: "count-desc",
      themePreference: "system",
    }),
    {
      name: "mobile-preferences",
      partialize: (state: MobilePreferencesState) => ({
        groupLastOpenedAt: state.groupLastOpenedAt,
        groupSortOrder: state.groupSortOrder,
        leftSwipeAction: state.leftSwipeAction,
        locale: state.locale,
        rightSwipeAction: state.rightSwipeAction,
        tagSortOrder: state.tagSortOrder,
        themePreference: state.themePreference,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
