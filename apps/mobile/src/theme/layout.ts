/** Shared layout dimensions for touch targets, spacing, and chrome. */
export const MOBILE_LAYOUT = {
  avatar: {
    editor: 96,
    hero: 88,
    heroRadius: 44,
    list: 34,
    profile: 52,
  },
  borderRadius: {
    control: 10,
    pill: 999,
  },
  floatingTabBar: {
    /** Extra top padding when a screen header sits below the status bar only. */
    screenHeaderInset: 40,
  },
  iconButton: 32,
  inputCompact: 40,
  menuMinWidth: 200,
  screenChrome: {
    /** Gap between title row and accessory content (e.g. search). */
    accessoryTopMargin: 12,
    largeTitleFontSize: 28,
    /** Extra padding below safe area on stack push screens. */
    stackNavVerticalPadding: 8,
    /** Top padding for tab-root screen headers below the status bar. */
    tabRootTopPadding: 54,
    /** Fixed title row for tab-root browse and selection toolbars. */
    titleRowHeight: 34,
    /** Minimum width for toolbar header left/right action slots. */
    toolbarSlotMinWidth: 72,
  },
  spacing: {
    contentBottom: 32,
    contentTop: 16,
    horizontal: 16,
  },
  touchTarget: 44,
  touchTargetLarge: 52,
} as const;

/** Z-order for the floating tab chrome overlay. */
export const MOBILE_Z_INDEX = {
  fabChrome: 1001,
} as const;

/** Expand tappable areas without changing visual size. */
export const MOBILE_HIT_SLOP = {
  compact: 8,
  icon: 10,
  nav: 12,
} as const;
