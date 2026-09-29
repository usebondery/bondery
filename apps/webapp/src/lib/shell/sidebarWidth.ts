export const SIDEBAR_COLLAPSED_WIDTH = 80;
export const SIDEBAR_DEFAULT_EXPANDED_WIDTH = 280;
export const SIDEBAR_MIN_EXPANDED_WIDTH = 240;
export const SIDEBAR_MAX_EXPANDED_WIDTH = 480;
/** Midpoint between collapsed and min expanded — drag past this to leave icon mode. */
export const SIDEBAR_EXPAND_FROM_COLLAPSED_WIDTH = 160;

export type SnapSidebarWidthInput = {
  lastExpandedWidth: number;
  proposedWidth: number;
  startWidth: number;
};

export type SnapSidebarWidthResult = {
  lastExpandedWidth: number;
  width: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isSidebarCollapsed(width: number): boolean {
  return width <= SIDEBAR_COLLAPSED_WIDTH;
}

/**
 * Mobile AppShell navbar is an overlay: always expanded width below `sm`,
 * ignoring the collapsed-rail cookie. Desktop keeps the live resized width.
 */
export function getAppShellNavbarWidth(desktopWidth: number): {
  base: number;
  sm: number;
} {
  return {
    base: SIDEBAR_DEFAULT_EXPANDED_WIDTH,
    sm: desktopWidth,
  };
}

/** Overlay never uses the 80px icon rail. */
export function resolveSidebarCollapsed(
  isMobileOverlay: boolean,
  desktopCollapsed: boolean,
): boolean {
  return isMobileOverlay ? false : desktopCollapsed;
}

export function clampSidebarDragWidth(proposedWidth: number): number {
  return clamp(proposedWidth, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_MAX_EXPANDED_WIDTH);
}

export function clampExpandedSidebarWidth(width: number): number {
  return clamp(width, SIDEBAR_MIN_EXPANDED_WIDTH, SIDEBAR_MAX_EXPANDED_WIDTH);
}

export function snapSidebarWidth({
  lastExpandedWidth,
  proposedWidth,
  startWidth,
}: SnapSidebarWidthInput): SnapSidebarWidthResult {
  const restoredExpanded = clampExpandedSidebarWidth(
    Number.isFinite(lastExpandedWidth) ? lastExpandedWidth : SIDEBAR_DEFAULT_EXPANDED_WIDTH,
  );

  if (isSidebarCollapsed(startWidth)) {
    if (proposedWidth >= SIDEBAR_EXPAND_FROM_COLLAPSED_WIDTH) {
      return { lastExpandedWidth: restoredExpanded, width: restoredExpanded };
    }
    return { lastExpandedWidth: restoredExpanded, width: SIDEBAR_COLLAPSED_WIDTH };
  }

  if (proposedWidth < SIDEBAR_MIN_EXPANDED_WIDTH) {
    return {
      lastExpandedWidth: clampExpandedSidebarWidth(startWidth),
      width: SIDEBAR_COLLAPSED_WIDTH,
    };
  }

  const next = clampExpandedSidebarWidth(proposedWidth);
  return { lastExpandedWidth: next, width: next };
}

export function parseStoredSidebarWidth(
  widthCookie: string | undefined,
  legacyCollapsedCookie: string | undefined,
): number {
  if (widthCookie !== undefined && widthCookie !== "") {
    if (widthCookie === "true") {
      return SIDEBAR_COLLAPSED_WIDTH;
    }
    if (widthCookie === "false") {
      return SIDEBAR_DEFAULT_EXPANDED_WIDTH;
    }
    const parsed = Number(widthCookie);
    if (Number.isFinite(parsed)) {
      if (parsed <= SIDEBAR_COLLAPSED_WIDTH) {
        return SIDEBAR_COLLAPSED_WIDTH;
      }
      return clampExpandedSidebarWidth(parsed);
    }
  }

  if (legacyCollapsedCookie === "true") {
    return SIDEBAR_COLLAPSED_WIDTH;
  }

  return SIDEBAR_DEFAULT_EXPANDED_WIDTH;
}

export function parseStoredLastExpandedWidth(cookie: string | undefined): number {
  if (cookie === undefined || cookie === "") {
    return SIDEBAR_DEFAULT_EXPANDED_WIDTH;
  }
  const parsed = Number(cookie);
  if (!Number.isFinite(parsed)) {
    return SIDEBAR_DEFAULT_EXPANDED_WIDTH;
  }
  return clampExpandedSidebarWidth(parsed);
}
