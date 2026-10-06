export type PersonChipSize = "sm" | "md";

export function personChipSizes(size: PersonChipSize) {
  return {
    avatarEdgeSize: size === "sm" ? 26 : 32,
    avatarSize: size === "sm" ? 16 : 20,
    badgeSize: (size === "sm" ? "lg" : "xl") as "lg" | "xl",
    chevronSize: size === "sm" ? 12 : 14,
    clearSize: size === "sm" ? 12 : 14,
    endPadding: size === "sm" ? 8 : 10,
  };
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
    },
  };
}
