import type { DateTimeFormatContext } from "@bondery/helpers/date";
import { getDeviceTimezone } from "@bondery/helpers/locale";
import type { DateFormatPreference, TimeFormatPreference } from "@bondery/schemas";
import { dirForLocale } from "@bondery/schemas/locale";
import { DEFAULT_LOCALE, type SupportedLocale } from "@bondery/schemas/locale/supported-locale";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyNativeTextDirection, reloadAppForLayoutDirection } from "../i18n/documentDirection";
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
  dateFormat: DateFormatPreference;
  groupLastOpenedAt: Record<string, number>;
  groupSortOrder: GroupSortOrder;
  hydrateFromServer: (data: {
    dateFormat?: DateFormatPreference;
    leftSwipeAction?: SwipeAction;
    rightSwipeAction?: SwipeAction;
    groupSortOrder?: GroupSortOrder;
    tagSortOrder?: TagSortOrder;
    timeFormat?: TimeFormatPreference;
    timezone?: string;
  }) => void;
  leftSwipeAction: SwipeAction;
  locale: MobileLocale;
  recordGroupOpened: (groupId: string) => void;
  rightSwipeAction: SwipeAction;
  setDateFormat: (dateFormat: DateFormatPreference) => void;
  setGroupSortOrder: (order: GroupSortOrder) => void;
  setLeftSwipeAction: (action: SwipeAction) => void;
  setLocale: (locale: MobileLocale) => void;
  setRightSwipeAction: (action: SwipeAction) => void;
  setTagSortOrder: (order: TagSortOrder) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  setTimeFormat: (timeFormat: TimeFormatPreference) => void;
  setTimezone: (timezone: string) => void;
  tagSortOrder: TagSortOrder;
  themePreference: ThemePreference;
  timeFormat: TimeFormatPreference;
  timezone: string;
}

export function mobileDateTimeFormatContext(
  state: Pick<MobilePreferencesState, "dateFormat" | "locale" | "timeFormat" | "timezone">,
): DateTimeFormatContext {
  return {
    dateFormat: state.dateFormat,
    locale: state.locale,
    timeFormat: state.timeFormat,
    timeZone: state.timezone,
  };
}

export function useMobileDateTimeFormatContext(): DateTimeFormatContext {
  const dateFormat = useMobilePreferences((state) => state.dateFormat);
  const locale = useMobilePreferences((state) => state.locale);
  const timeFormat = useMobilePreferences((state) => state.timeFormat);
  const timezone = useMobilePreferences((state) => state.timezone);
  return mobileDateTimeFormatContext({ dateFormat, locale, timeFormat, timezone });
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
      dateFormat: "locale",
      groupLastOpenedAt: {},
      groupSortOrder: "count-desc",
      hydrateFromServer: (data) =>
        set((state) => ({
          dateFormat: data.dateFormat ?? state.dateFormat,
          groupSortOrder: data.groupSortOrder ?? state.groupSortOrder,
          leftSwipeAction: data.leftSwipeAction ?? state.leftSwipeAction,
          rightSwipeAction: data.rightSwipeAction ?? state.rightSwipeAction,
          tagSortOrder: data.tagSortOrder ?? state.tagSortOrder,
          timeFormat: data.timeFormat ?? state.timeFormat,
          timezone: data.timezone ?? state.timezone,
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
      setDateFormat: (dateFormat: DateFormatPreference) => set({ dateFormat }),
      setGroupSortOrder: (groupSortOrder: GroupSortOrder) => set({ groupSortOrder }),
      setLeftSwipeAction: (leftSwipeAction: SwipeAction) => set({ leftSwipeAction }),
      setLocale: (locale: MobileLocale) =>
        set((state) => {
          if (state.locale === locale) {
            return state;
          }

          const previousDirection = dirForLocale(state.locale);
          const nextDirection = dirForLocale(locale);
          void i18n.changeLanguage(locale);

          if (previousDirection !== nextDirection && applyNativeTextDirection(nextDirection)) {
            reloadAppForLayoutDirection();
          }

          return { locale };
        }),
      setRightSwipeAction: (rightSwipeAction: SwipeAction) => set({ rightSwipeAction }),
      setTagSortOrder: (tagSortOrder: TagSortOrder) => set({ tagSortOrder }),
      setThemePreference: (themePreference: ThemePreference) => set({ themePreference }),
      setTimeFormat: (timeFormat: TimeFormatPreference) => set({ timeFormat }),
      setTimezone: (timezone: string) => set({ timezone }),
      tagSortOrder: "count-desc",
      themePreference: "system",
      timeFormat: "24h",
      timezone: getDeviceTimezone(),
    }),
    {
      name: "mobile-preferences",
      partialize: (state: MobilePreferencesState) => ({
        dateFormat: state.dateFormat,
        groupLastOpenedAt: state.groupLastOpenedAt,
        groupSortOrder: state.groupSortOrder,
        leftSwipeAction: state.leftSwipeAction,
        locale: state.locale,
        rightSwipeAction: state.rightSwipeAction,
        tagSortOrder: state.tagSortOrder,
        themePreference: state.themePreference,
        timeFormat: state.timeFormat,
        timezone: state.timezone,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
