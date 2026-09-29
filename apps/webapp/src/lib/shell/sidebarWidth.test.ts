import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampSidebarDragWidth,
  getAppShellNavbarWidth,
  parseStoredLastExpandedWidth,
  parseStoredSidebarWidth,
  resolveSidebarCollapsed,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_EXPANDED_WIDTH,
  SIDEBAR_MAX_EXPANDED_WIDTH,
  SIDEBAR_MIN_EXPANDED_WIDTH,
  snapSidebarWidth,
} from "./sidebarWidth.js";

describe("snapSidebarWidth", () => {
  it("snaps below min expanded to collapsed", () => {
    const result = snapSidebarWidth({
      lastExpandedWidth: 300,
      proposedWidth: 200,
      startWidth: 280,
    });
    assert.deepEqual(result, {
      lastExpandedWidth: 280,
      width: SIDEBAR_COLLAPSED_WIDTH,
    });
  });

  it("clamps above max expanded", () => {
    const result = snapSidebarWidth({
      lastExpandedWidth: 280,
      proposedWidth: 600,
      startWidth: 280,
    });
    assert.deepEqual(result, {
      lastExpandedWidth: SIDEBAR_MAX_EXPANDED_WIDTH,
      width: SIDEBAR_MAX_EXPANDED_WIDTH,
    });
  });

  it("restores last expanded when dragging out of collapsed past the midpoint", () => {
    const result = snapSidebarWidth({
      lastExpandedWidth: 320,
      proposedWidth: 160,
      startWidth: SIDEBAR_COLLAPSED_WIDTH,
    });
    assert.deepEqual(result, { lastExpandedWidth: 320, width: 320 });
  });

  it("stays collapsed when the drag from icon mode is too small", () => {
    const result = snapSidebarWidth({
      lastExpandedWidth: 320,
      proposedWidth: 120,
      startWidth: SIDEBAR_COLLAPSED_WIDTH,
    });
    assert.deepEqual(result, {
      lastExpandedWidth: 320,
      width: SIDEBAR_COLLAPSED_WIDTH,
    });
  });

  it("clamps last expanded memory to the expanded range", () => {
    const result = snapSidebarWidth({
      lastExpandedWidth: 12,
      proposedWidth: 200,
      startWidth: SIDEBAR_COLLAPSED_WIDTH,
    });
    assert.equal(result.width, SIDEBAR_MIN_EXPANDED_WIDTH);
    assert.equal(result.lastExpandedWidth, SIDEBAR_MIN_EXPANDED_WIDTH);
  });
});

describe("clampSidebarDragWidth", () => {
  it("clamps live drag between collapsed and max", () => {
    assert.equal(clampSidebarDragWidth(10), SIDEBAR_COLLAPSED_WIDTH);
    assert.equal(clampSidebarDragWidth(900), SIDEBAR_MAX_EXPANDED_WIDTH);
    assert.equal(clampSidebarDragWidth(300), 300);
  });
});

describe("parseStoredSidebarWidth", () => {
  it("migrates the legacy collapsed cookie", () => {
    assert.equal(parseStoredSidebarWidth(undefined, "true"), SIDEBAR_COLLAPSED_WIDTH);
  });

  it("defaults to the expanded width when cookies are missing", () => {
    assert.equal(parseStoredSidebarWidth(undefined, undefined), SIDEBAR_DEFAULT_EXPANDED_WIDTH);
  });

  it("reads a stored pixel width", () => {
    assert.equal(parseStoredSidebarWidth("80", undefined), SIDEBAR_COLLAPSED_WIDTH);
    assert.equal(parseStoredSidebarWidth("300", undefined), 300);
  });
});

describe("parseStoredLastExpandedWidth", () => {
  it("defaults and clamps", () => {
    assert.equal(parseStoredLastExpandedWidth(undefined), SIDEBAR_DEFAULT_EXPANDED_WIDTH);
    assert.equal(parseStoredLastExpandedWidth("500"), SIDEBAR_MAX_EXPANDED_WIDTH);
    assert.equal(parseStoredLastExpandedWidth("100"), SIDEBAR_MIN_EXPANDED_WIDTH);
  });
});

describe("getAppShellNavbarWidth", () => {
  it("uses expanded width below sm and the desktop width from sm up", () => {
    assert.deepEqual(getAppShellNavbarWidth(SIDEBAR_COLLAPSED_WIDTH), {
      base: SIDEBAR_DEFAULT_EXPANDED_WIDTH,
      sm: SIDEBAR_COLLAPSED_WIDTH,
    });
    assert.deepEqual(getAppShellNavbarWidth(320), {
      base: SIDEBAR_DEFAULT_EXPANDED_WIDTH,
      sm: 320,
    });
  });
});

describe("resolveSidebarCollapsed", () => {
  it("forces expanded labels in the mobile overlay", () => {
    assert.equal(resolveSidebarCollapsed(true, true), false);
    assert.equal(resolveSidebarCollapsed(true, false), false);
  });

  it("keeps the desktop rail collapsed state", () => {
    assert.equal(resolveSidebarCollapsed(false, true), true);
    assert.equal(resolveSidebarCollapsed(false, false), false);
  });
});
