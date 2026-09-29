"use client";

import { type ActionIconProps, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { ActionIconButton } from "#ActionIconButton/ActionIconButton.js";

export interface CopyButtonProps extends Omit<ActionIconProps, "onClick" | "children"> {
  /** Duration in ms to show the copied state. Defaults to 2000. */
  copiedDuration?: number;
  /** Tooltip label shown after copying. */
  copiedLabel?: string;
  /** Tooltip label shown before copying. */
  copyLabel?: string;
  /** Called after a successful clipboard write. */
  onCopied?: () => void;
  /** The text that will be written to the clipboard on click. */
  value: string;
}

/**
 * An action icon button that copies a value to the clipboard.
 * Turns green and shows a check icon briefly after copying.
 */
export function CopyButton({
  value,
  copyLabel = "Copy",
  copiedLabel = "Copied!",
  copiedDuration = 2000,
  onCopied,
  variant = "subtle",
  size = "xs",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), copiedDuration);
    });
  }

  return (
    <Tooltip label={copied ? copiedLabel : copyLabel}>
      <ActionIconButton
        aria-label={copied ? copiedLabel : copyLabel}
        color={copied ? "green" : "gray"}
        icon={copied ? <IconCheck /> : <IconCopy />}
        onClick={handleCopy}
        size={size}
        variant={variant}
        {...props}
      />
    </Tooltip>
  );
}
