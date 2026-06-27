/** Shared layout dimensions for touch targets, spacing, and chrome. */
export const MOBILE_LAYOUT = {
  touchTarget: 44,
  touchTargetLarge: 52,
  iconButton: 32,
  inputCompact: 40,
  borderRadius: {
    control: 10,
    pill: 999,
  },
  screenChrome: {
    /** Fixed title row for tab-root browse and selection toolbars. */
    titleRowHeight: 34,
    largeTitleFontSize: 28,
    /** Top padding for tab-root screen headers below the status bar. */
    tabRootTopPadding: 54,
    /** Extra padding below safe area on stack push screens. */
    stackNavVerticalPadding: 8,
    /** Gap between title row and accessory content (e.g. search). */
    accessoryTopMargin: 12,
    /** Minimum width for toolbar header left/right action slots. */
    toolbarSlotMinWidth: 72,
  },
  floatingTabBar: {
    tabBubble: 46,
    plusBubble: 56,
    /** Top padding for scroll content sitting above the floating tab bar. */
    contentInset: 54,
    /** Gap between stacked FAB speed-dial menu items. */
    speedDialItemGap: 8,
    /** Gap between the FAB menu stack and the plus bubble top edge. */
    speedDialAnchorGap: 12,
    /** Inline speed-dial items before falling back to ActionListSheet. */
    speedDialMaxInlineItems: 4,
    /** Combined vertical padding inside the tab rail (top + bottom). */
    railVerticalPadding: 16,
    /** Inner padding between speed-dial menu rows and the tab rail row. */
    speedDialMenuPadding: 8,
    /** Corner radius for the unified chrome when the speed-dial is expanded. */
    speedDialChromeRadiusOpen: 22,
    /** Extra top padding when a screen header sits below the status bar only. */
    screenHeaderInset: 40,
    /** Scroll inset when the selection action bar replaces the tab bar (rail + safe area). */
    selectionBarInset: 62,
  },
  spacing: {
    contentTop: 16,
    contentBottom: 32,
    horizontal: 16,
  },
  menuMinWidth: 200,
  avatar: {
    hero: 88,
    heroRadius: 44,
  },
  alphabetScroller: {
    bubble: 48,
  },
} as const;

/** Z-order for portaled FAB speed-dial layers. */
export const MOBILE_Z_INDEX = {
  fabScrim: 1000,
  fabChrome: 1001,
  fabMenu: 1002,
} as const;

/** Expand tappable areas without changing visual size. */
export const MOBILE_HIT_SLOP = {
  nav: 12,
  icon: 10,
  compact: 8,
} as const;
