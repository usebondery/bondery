import { CONTACT_FIELD_MAX_LENGTHS, CONTACT_LIMITS } from "@bondery/schemas";
import Constants from "expo-constants";
import { Platform } from "react-native";

type MobileExtra = {
  apiUrl?: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
  syncDebug?: string;
  websiteUrl?: string;
};

function getExtra(): MobileExtra {
  return (Constants.expoConfig?.extra ?? {}) as MobileExtra;
}

export function normalizeMobileUrlForDevice(urlValue: string): string {
  if (!urlValue || Platform.OS !== "android") {
    return urlValue;
  }

  try {
    const parsed = new URL(urlValue);
    if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
      parsed.hostname = "10.0.2.2";
      return parsed.toString();
    }
  } catch {
    // Leave invalid values unchanged and let existing config validation handle them.
  }

  return urlValue;
}

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "").replace(/\/api$/, "");
}

const extra = getExtra();
const rawApiUrl = normalizeMobileUrlForDevice(extra.apiUrl || "");
const rawSupabaseUrl = normalizeMobileUrlForDevice(extra.supabaseUrl || "");

export const API_URL = rawApiUrl ? normalizeApiBaseUrl(rawApiUrl) : "";
export const SUPABASE_URL = rawSupabaseUrl;
export const SUPABASE_ANON_KEY = extra.supabasePublishableKey || "";
export const WEBSITE_URL = extra.websiteUrl || "https://usebondery.com";
export const HAS_MOBILE_CONFIG = Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
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
  /** Press-hold duration before FAB drag-select reveals the menu. */
  fabDragRevealMs: 80,
  /** FAB speed-dial scrim and menu exit animation. */
  fabMenuCloseMs: 150,
  /** Maximum cumulative stagger delay for FAB menu items. */
  fabMenuStaggerMaxMs: 120,
  /** Per-item enter delay when the FAB menu opens. */
  fabMenuStaggerMs: 40,
  /** Max press duration treated as a tap (not drag) on the FAB. */
  fabTapMaxMs: 150,
  /** Border color transition when a text input gains or loses focus. */
  inputFocusTransition: 200,
  /** Default long-press duration before secondary actions (e.g. edit social). */
  longPressDelay: 350,
  /**
   * Overflow popover enter/exit + FAB speed-dial open-guard window (Tamagui `quick` via `POPOVER_MOTION`).
   */
  popoverTransitionMs: 200,
  /** Delay between FlashList scroll-to-index retries. */
  scrollRetryDelay: 40,
  /** Hold duration to arm drag-select while already in a selection session. */
  selectionDragArmDelay: 250,
  /** Wait for sheet/modal open animation before focusing an input. */
  sheetFocusDelay: 150,
  /** Default auto-dismiss duration for app toasts. */
  toastDuration: 4000,
  /** LayoutAnimation duration for toast enter/exit. */
  toastLayoutAnimation: 200,
} as const;

/** FAB speed-dial gesture thresholds (pixels). */
export const FAB_GESTURE = {
  /** Drag below the FAB center that cancels selection. */
  cancelZoneBelowPx: 24,
  /** Movement before press-drag arms on the FAB. */
  dragThresholdPx: 8,
  /** Vertical bridge between menu items for drag hit-testing. */
  itemBridgePx: 16,
} as const;

/** FlashList scroll-to-index retry behaviour. */
export const LIST_SCROLL = {
  maxRetries: 3,
} as const;

/** Tamagui sheet snap points (percent of screen height). */
export const SHEET_SNAP_POINTS = {
  /** Phone / email edit sheets with multiple fields. */
  channelEdit: 72,
  /** Title + two-button confirm sheets (delete, etc.). */
  confirm: 32,
  /** Single-field create contact sheet. */
  createContact: 42,
  /** Important date wheel picker sheet. */
  dateWheel: 55,
  default: 45,
  /** Identity edit sheet (avatar + name fields). */
  identityEdit: 85,
  /** Important date add/edit form sheet. */
  importantDateEdit: 72,
  selectSearch: 85,
  selectSimple: 40,
  socialAdd: 54,
  socialAddSimple: 46,
  socialEdit: 48,
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

/** Page size for contacts list pagination. */
export const CONTACTS_PAGE_SIZE = 50;

/** Max contacts fetched for a single group view (API allows up to 200). */
export const GROUP_CONTACTS_FETCH_LIMIT = 200;

/** Notes longer than this collapse behind a "read more" control. */
export const NOTES_COLLAPSE_CHAR_THRESHOLD = 200;

/** Milliseconds in one day (for relative date helpers). */
export const MS_PER_DAY = 86_400_000;

export function assertMobileConfig() {
  if (!API_URL) {
    throw new Error("Missing BONDERY_PUBLIC_API_URL");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase config. Set BONDERY_PUBLIC_SUPABASE_URL and BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}
