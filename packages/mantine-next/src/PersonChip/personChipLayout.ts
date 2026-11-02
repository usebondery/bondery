export type PersonChipSize = "sm" | "md";

/**
 * Single source for chip height. The bleeding avatar uses the same value, so it
 * reaches both chip edges. Badge `size` still supplies font size and padding.
 */
const CHIP_HEIGHT_PX: Record<PersonChipSize, number> = { md: 32, sm: 26 };

export function personChipSizes(size: PersonChipSize) {
  return {
    avatarEdgeSize: CHIP_HEIGHT_PX[size],
    avatarSize: size === "sm" ? 16 : 20,
    // Drives the badge height directly, so the `lg`/`xl` badge heights no longer
    // have to equal the avatar height by coincidence.
    badgeHeight: CHIP_HEIGHT_PX[size],
    badgeSize: (size === "sm" ? "lg" : "xl") as "lg" | "xl",
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
export function personChipBadgeVars(size: PersonChipSize) {
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
}) {
  const sizes = personChipSizes(args.size);

  return {
    label: {
      color: args.hasPerson ? undefined : "var(--mantine-color-dimmed)",
      fontWeight: 400,
      overflow: "visible" as const,
      textTransform: "none" as const,
    },
    root: {
      cursor: args.interactive && !args.disabled ? "pointer" : "default",
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
  } as const;
}
