type PersonChipSize = "sm" | "md";

/**
 * Single source for chip height. The bleeding avatar uses the same value, so it
 * reaches both chip edges. Badge `size` still supplies font size and padding.
 */
const CHIP_HEIGHT_PX: Record<PersonChipSize, number> = { md: 32, sm: 26 };

type PersonChipBadgeVars = () => {
  root: { "--badge-height": string };
};

type PersonChipBadgeStyles = {
  label: {
    color: string | undefined;
    fontWeight: 400;
    minWidth: number | undefined;
    overflow: "hidden" | "visible";
    textOverflow: "ellipsis" | undefined;
    textTransform: "none";
  };
  root: {
    cursor: "pointer" | "default";
    maxWidth: string | undefined;
    minWidth: number | undefined;
    opacity: number;
    paddingInlineEnd: number | undefined;
    paddingInlineStart: number | undefined;
    verticalAlign: "middle";
  };
  section: {
    maxHeight: "none";
  };
};

export type { PersonChipSize };

export type PersonChipSizes = {
  avatarEdgeSize: number;
  avatarSize: number;
  badgeHeight: number;
  badgeSize: "lg" | "xl";
  chevronSize: number;
  clearSize: number;
  endPadding: number;
};

export function personChipSizes(size: PersonChipSize): PersonChipSizes {
  return {
    avatarEdgeSize: CHIP_HEIGHT_PX[size],
    avatarSize: size === "sm" ? 16 : 20,
    // Drives the badge height directly, so the `lg`/`xl` badge heights no longer
    // have to equal the avatar height by coincidence.
    badgeHeight: CHIP_HEIGHT_PX[size],
    badgeSize: size === "sm" ? "lg" : "xl",
    chevronSize: size === "sm" ? 12 : 14,
    clearSize: size === "sm" ? 12 : 14,
    endPadding: size === "sm" ? 8 : 10,
  };
}

/**
 * Badge `vars` resolver for this chip. Badge takes a resolver function, and
 * Mantine merges `varsResolver` output before it, so a `--badge-height` set
 * through `styles` alone is overwritten by the badge `size` value.
 */
export function personChipBadgeVars(size: PersonChipSize): PersonChipBadgeVars {
  const sizes = personChipSizes(size);
  return () => ({
    root: { "--badge-height": `calc(${sizes.badgeHeight}px * var(--mantine-scale))` },
  });
}

export function personChipBadgeStyles(args: {
  avatarEdge: boolean;
  disabled: boolean;
  hasEndSection: boolean;
  hasPerson: boolean;
  interactive: boolean;
  size: PersonChipSize;
  /**
   * Lets the chip shrink below its name width and ellipsize the name. Use it in
   * a row that must not overflow, such as a merge suggestion on a narrow card.
   */
  truncate: boolean;
}): PersonChipBadgeStyles {
  const sizes = personChipSizes(args.size);

  return {
    label: {
      color: args.hasPerson ? undefined : "var(--mantine-color-dimmed)",
      fontWeight: 400,
      // A grid item keeps its content width until `min-width` allows a shrink.
      minWidth: args.truncate ? 0 : undefined,
      overflow: args.truncate ? "hidden" : "visible",
      textOverflow: args.truncate ? "ellipsis" : undefined,
      textTransform: "none",
    },
    root: {
      cursor: args.interactive && !args.disabled ? "pointer" : "default",
      maxWidth: args.truncate ? "100%" : undefined,
      // A flex item keeps its content width until `min-width` allows a shrink.
      minWidth: args.truncate ? 0 : undefined,
      opacity: args.disabled ? 0.6 : 1,
      paddingInlineEnd: args.hasPerson && args.hasEndSection ? sizes.endPadding : undefined,
      paddingInlineStart: args.hasPerson && args.avatarEdge ? 0 : undefined,
      // A baseline-aligned chip lets the avatar image set the chip baseline at its
      // bottom edge, which lifts the chip and leaves phantom space below it.
      // `middle` centres the chip on the line for both photo and initials avatars.
      verticalAlign: "middle",
    },
    section: {
      // Mantine caps the section at height minus borders, which is shorter than a
      // full-bleed avatar in both sizes. Let the avatar fill the chip.
      maxHeight: "none",
    },
  };
}
