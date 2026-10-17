import { CONTACT_FIELD_MAX_LENGTHS, CONTACT_LIMITS } from "@bondery/schemas";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  metroHostFromHostUri,
  resolveAndroidLoopbackHost,
  rewriteLoopbackHostname,
} from "./config-loopback";

type MobileExtra = {
  apiUrl?: string;
  storageUrl?: string;
  syncDebug?: string;
  websiteUrl?: string;
};

function getExtra(): MobileExtra {
  return (Constants.expoConfig?.extra ?? {}) as MobileExtra;
}

function androidLoopbackHost(): string {
  return resolveAndroidLoopbackHost(metroHostFromHostUri(Constants.expoConfig?.hostUri));
}

export function normalizeMobileUrlForDevice(urlValue: string): string {
  if (!urlValue || Platform.OS !== "android") {
    return urlValue;
  }

  return rewriteLoopbackHostname(urlValue, androidLoopbackHost());
}

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "").replace(/\/api$/, "");
}

const extra = getExtra();
const rawApiUrl = normalizeMobileUrlForDevice(extra.apiUrl || "");
const rawStorageUrl = normalizeMobileUrlForDevice(extra.storageUrl || "");

export const API_URL = rawApiUrl ? normalizeApiBaseUrl(rawApiUrl) : "";
export const STORAGE_URL = rawStorageUrl.replace(/\/+$/, "");
export const WEBSITE_URL = extra.websiteUrl || "https://usebondery.com";
export const HAS_MOBILE_CONFIG = Boolean(API_URL && STORAGE_URL);
export const SYNC_DEBUG = extra.syncDebug === "1" || extra.syncDebug === "true";

/** UI debounce delay constants (milliseconds). Visual/layout tokens: `theme/tokens`. */
export const DEBOUNCE_MS = {
  /** Delay for local in-memory filters (emoji picker, etc.). */
  localFilter: 200,
  /** Delay for text search inputs before triggering a server fetch. */
  search: 600,
} as const;

/** Shared alpha values for mobile UI (press states, selection tints, etc.). */
export const MOBILE_OPACITY = {
  /** Disabled control opacity. */
  disabled: 0.38,
  /** Pressed control opacity fallback. */
  pressed: 0.9,
  /** Subtle selected-state background tint on primary-colored controls. */
  selectedTint: 0.12,
} as const;

/** UI timing constants (milliseconds). */
export const UI_TIMING_MS = {
  /** Border color transition when a text input gains or loses focus. */
  inputFocusTransition: 200,
  /** Default long-press duration before secondary actions (e.g. edit social). */
  longPressDelay: 350,
  /** Overflow menu open guard window (matches menu fade timing). */
  popoverTransitionMs: 200,
  /** Delay between FlashList scroll-to-index retries. */
  scrollRetryDelay: 40,
  /** Hold duration to arm drag-select while already in a selection session. */
  selectionDragArmDelay: 250,
  /** Wait for sheet/modal open animation before focusing an input. */
  sheetFocusDelay: 150,
  /** Defer opening a stacked sheet until the current sheet finishes closing. */
  sheetStackOpenDelay: 320,
  /** Default auto-dismiss duration for app toasts. */
  toastDuration: 4000,
  /** LayoutAnimation duration for toast enter/exit. */
  toastLayoutAnimation: 200,
} as const;

/** FlashList scroll-to-index retry behaviour. */
export const LIST_SCROLL = {
  maxRetries: 3,
} as const;

/** Sheet snap points (percent of screen height) for named `ui/Sheet` sizes. */
export const SHEET_SNAP_POINTS = {
  /** Title + two-button confirm sheets (delete, etc.). */
  confirm: 32,
  selectSearch: 85,
  selectSimple: 40,
} as const;

export const INPUT_MAX_LENGTHS = {
  dateName: CONTACT_FIELD_MAX_LENGTHS.dateNote,
  firstName: CONTACT_FIELD_MAX_LENGTHS.firstName,
  headline: CONTACT_FIELD_MAX_LENGTHS.headline,
  lastName: CONTACT_FIELD_MAX_LENGTHS.lastName,
  middleName: CONTACT_FIELD_MAX_LENGTHS.middleName,
} as const;

export const LIMITS = {
  maxAddresses: 5,
  maxImportantDates: CONTACT_LIMITS.maxImportantDates,
} as const;

export const AVATAR_UPLOAD = {
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"] as const,
  maxFileSize: 5 * 1024 * 1024,
  maxFileSizeMB: 5,
} as const;

/** Wheel picker row height (matches minimum touch target). */
export const WHEEL_PICKER_ITEM_HEIGHT = 44;
export const WHEEL_PICKER_VISIBLE_ROWS = 5;

/** Notes longer than this collapse behind a "read more" control. */
export const NOTES_COLLAPSE_CHAR_THRESHOLD = 200;

/** Milliseconds in one day (for relative date helpers). */
export const MS_PER_DAY = 86_400_000;

export function assertMobileConfig() {
  if (!API_URL) {
    throw new Error("Missing BONDERY_PUBLIC_API_URL");
  }

  if (!STORAGE_URL) {
    throw new Error("Missing BONDERY_PUBLIC_STORAGE_URL");
  }
}
