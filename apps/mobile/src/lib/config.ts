import { Platform } from "react-native";
import { CONTACT_FIELD_MAX_LENGTHS, CONTACT_LIMITS } from "@bondery/schemas";

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

const rawApiUrl = normalizeMobileUrlForDevice(process.env.EXPO_PUBLIC_API_URL || "");
const rawSupabaseUrl = normalizeMobileUrlForDevice(process.env.EXPO_PUBLIC_SUPABASE_URL || "");

export const API_URL = rawApiUrl ? normalizeApiBaseUrl(rawApiUrl) : "";
export const SUPABASE_URL = rawSupabaseUrl;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL || "https://usebondery.com";
export const HAS_MOBILE_CONFIG = Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);

/** UI debounce delay constants (milliseconds). Visual/layout tokens: `theme/tokens`. */
export const DEBOUNCE_MS = {
  /** Delay for text search inputs before triggering a server fetch. */
  search: 600,
  /** Delay for local in-memory filters (emoji picker, etc.). */
  localFilter: 200,
} as const;

/** Shared alpha values for mobile UI (press states, selection tints, etc.). */
export const MOBILE_OPACITY = {
  /** Subtle selected-state background tint on primary-colored controls. */
  selectedTint: 0.12,
  /** Disabled control opacity. */
  disabled: 0.38,
  /** Pressed control opacity fallback. */
  pressed: 0.9,
} as const;

/** UI timing constants (milliseconds). */
export const UI_TIMING_MS = {
  /** Wait for sheet/modal open animation before focusing an input. */
  sheetFocusDelay: 150,
  /** Delay between FlashList scroll-to-index retries. */
  scrollRetryDelay: 40,
  /** Default long-press duration before secondary actions (e.g. edit social). */
  longPressDelay: 350,
  /** Hold duration to arm drag-select while already in a selection session. */
  selectionDragArmDelay: 250,
  /** LayoutAnimation duration for toast enter/exit. */
  toastLayoutAnimation: 200,
  /** Border color transition when a text input gains or loses focus. */
  inputFocusTransition: 200,
  /** Default auto-dismiss duration for app toasts. */
  toastDuration: 4000,
  /**
   * Overflow popover enter/exit + FAB speed-dial open-guard window (Tamagui `quick` via `POPOVER_MOTION`).
   */
  popoverTransitionMs: 200,
  /** FAB speed-dial scrim and menu exit animation. */
  fabMenuCloseMs: 150,
  /** Per-item enter delay when the FAB menu opens. */
  fabMenuStaggerMs: 40,
  /** Maximum cumulative stagger delay for FAB menu items. */
  fabMenuStaggerMaxMs: 120,
  /** Press-hold duration before FAB drag-select reveals the menu. */
  fabDragRevealMs: 80,
  /** Max press duration treated as a tap (not drag) on the FAB. */
  fabTapMaxMs: 150,
} as const;

/** FAB speed-dial gesture thresholds (pixels). */
export const FAB_GESTURE = {
  /** Movement before press-drag arms on the FAB. */
  dragThresholdPx: 8,
  /** Drag below the FAB center that cancels selection. */
  cancelZoneBelowPx: 24,
  /** Vertical bridge between menu items for drag hit-testing. */
  itemBridgePx: 16,
} as const;

/** FlashList scroll-to-index retry behaviour. */
export const LIST_SCROLL = {
  maxRetries: 3,
} as const;

/** Tamagui sheet snap points (percent of screen height). */
export const SHEET_SNAP_POINTS = {
  /** Title + two-button confirm sheets (delete, etc.). */
  confirm: 32,
  default: 45,
  socialAddSimple: 46,
  socialEdit: 48,
  socialAdd: 54,
  selectSimple: 40,
  selectSearch: 85,
  /** Single-field create contact sheet. */
  createContact: 42,
  /** Phone / email edit sheets with multiple fields. */
  channelEdit: 72,
  /** Identity edit sheet (avatar + name fields). */
  identityEdit: 85,
  /** Important date wheel picker sheet. */
  dateWheel: 55,
  /** Important date add/edit form sheet. */
  importantDateEdit: 72,
} as const;

export const INPUT_MAX_LENGTHS = {
  firstName: CONTACT_FIELD_MAX_LENGTHS.firstName,
  middleName: CONTACT_FIELD_MAX_LENGTHS.middleName,
  lastName: CONTACT_FIELD_MAX_LENGTHS.lastName,
  headline: CONTACT_FIELD_MAX_LENGTHS.headline,
  dateName: CONTACT_FIELD_MAX_LENGTHS.dateNote,
} as const;

export const LIMITS = {
  maxImportantDates: CONTACT_LIMITS.maxImportantDates,
  maxAddresses: 5,
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
    throw new Error("Missing EXPO_PUBLIC_API_URL");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}
