import { dirForLocale } from "@bondery/schemas/locale";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DevSettings, I18nManager, Platform } from "react-native";

const PREFERENCES_KEY = "mobile-preferences";
export type DocumentDirection = "ltr" | "rtl";

export function resolveDocumentDirection(locale: string): DocumentDirection {
  return dirForLocale(locale);
}

/** Apply native RTL layout. Returns true when a full reload is required. */
export function applyNativeTextDirection(direction: DocumentDirection): boolean {
  const shouldRtl = direction === "rtl";
  if (I18nManager.isRTL === shouldRtl) {
    return false;
  }

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(shouldRtl);
  return true;
}

export function reloadAppForLayoutDirection(): void {
  if (Platform.OS === "web") {
    return;
  }
  DevSettings.reload();
}

export async function bootstrapDocumentDirectionFromStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      applyNativeTextDirection("ltr");
      return;
    }
    const parsed = JSON.parse(raw) as { state?: { locale?: string } };
    const locale = parsed.state?.locale ?? "en";
    applyNativeTextDirection(resolveDocumentDirection(locale));
  } catch {
    applyNativeTextDirection("ltr");
  }
}
