import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOBILE_THEME_COLORS } from "../../theme/colors.ts";
import { resolveActionButtonAccent, resolveActionButtonShell } from "./actionButtonStyles.ts";

const colors = MOBILE_THEME_COLORS.light;

describe("resolveActionButtonAccent", () => {
  it("maps tones and passes through custom strings", () => {
    assert.equal(resolveActionButtonAccent("primary", colors), colors.primary);
    assert.equal(resolveActionButtonAccent("#ff00aa", colors), "#ff00aa");
  });
});

describe("resolveActionButtonShell", () => {
  it("transparent variant has no border", () => {
    const shell = resolveActionButtonShell({
      color: "primary",
      colors,
      pressed: false,
      variant: "transparent",
    });

    assert.equal(shell.backgroundColor, "transparent");
    assert.equal(shell.borderWidth, 0);
  });

  it("outline uses surface and accent border", () => {
    const shell = resolveActionButtonShell({
      color: "#1877F2",
      colors,
      pressed: false,
      variant: "outline",
    });

    assert.equal(shell.backgroundColor, colors.surface);
    assert.equal(shell.borderColor, "#1877F2");
    assert.equal(shell.borderWidth, 1);
  });

  it("neutral outline matches input chrome", () => {
    const shell = resolveActionButtonShell({
      color: "neutral",
      colors,
      pressed: false,
      variant: "outline",
    });

    assert.equal(shell.backgroundColor, colors.inputBackground);
    assert.equal(shell.borderColor, colors.borderStrong);
  });

  it("outline dashed uses borderStrong", () => {
    const shell = resolveActionButtonShell({
      color: colors.textMuted,
      colors,
      dashed: true,
      pressed: false,
      variant: "outline",
    });

    assert.equal(shell.borderStyle, "dashed");
    assert.equal(shell.borderColor, colors.borderStrong);
  });

  it("filled primary uses press color when pressed", () => {
    const idle = resolveActionButtonShell({
      color: "primary",
      colors,
      pressed: false,
      variant: "filled",
    });
    const pressed = resolveActionButtonShell({
      color: "primary",
      colors,
      pressed: true,
      variant: "filled",
    });

    assert.equal(idle.backgroundColor, colors.primary);
    assert.equal(pressed.backgroundColor, colors.primaryPress);
  });

  it("backgroundColorOverride wins for transparent and filled", () => {
    const transparent = resolveActionButtonShell({
      backgroundColorOverride: colors.selectionBackground,
      color: "primary",
      colors,
      pressed: false,
      variant: "transparent",
    });

    assert.equal(transparent.backgroundColor, colors.selectionBackground);

    const filled = resolveActionButtonShell({
      backgroundColorOverride: colors.selectionBackground,
      color: "primary",
      colors,
      pressed: false,
      variant: "filled",
    });

    assert.equal(filled.backgroundColor, colors.selectionBackground);
  });
});
