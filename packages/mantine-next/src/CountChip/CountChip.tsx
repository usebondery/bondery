"use client";

import { Chip, Loader, type MantineColor } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";

export interface CountChipProps {
  /** Visible label when not loading. */
  children: ReactNode;
  color: MantineColor;
  /** Gray, non-accent appearance (e.g. a zero count). Ignored while loading. */
  disabled?: boolean;
  icon: ReactNode;
  isLoading?: boolean;
  /** Accessible name. Required because loading replaces visible `children` with a spinner. */
  label: string;
}

/** Display-only count chip. Not interactive — use for summaries in modals and cards. */
export function CountChip({
  children,
  color,
  disabled = false,
  icon,
  isLoading = false,
  label,
}: CountChipProps): ReactElement {
  const useAccent = !isLoading && !disabled;

  return (
    <Chip
      aria-busy={isLoading ? true : undefined}
      aria-label={label}
      checked={useAccent}
      color={useAccent ? color : "gray"}
      disabled={disabled && !isLoading}
      icon={icon}
      onChange={() => undefined}
      size="sm"
      style={{ pointerEvents: "none" }}
      tabIndex={-1}
      variant={useAccent ? "light" : "default"}
    >
      {isLoading ? <Loader color="gray" size={12} /> : children}
    </Chip>
  );
}
