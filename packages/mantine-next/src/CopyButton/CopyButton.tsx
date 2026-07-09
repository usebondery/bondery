"use client";

import { ActionIcon, type ActionIconProps, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";

export interface CopyButtonProps extends Omit<ActionIconProps, "onClick" | "children"> {
  /** Duration in ms to show the copied state. Defaults to 2000. */
  copiedDuration?: number;
  /** Tooltip label shown after copying. */
  copiedLabel?: string;
  /** Tooltip label shown before copying. */
  copyLabel?: string;
  /** Size of the icon inside the button. Defaults to 14. */
  iconSize?: number;
  /** Called after a successful clipboard write. */
  onCopied?: () => void;
  /** The text that will be written to the clipboard on click. */
  value: string;
}

/**
 * An action icon button that copies a value to the clipboard.
 * Turns green and shows a check icon briefly after copying.
 *
 * @param value - Text to copy to clipboard.
 * @param copyLabel - Tooltip shown before copying (default: "Copy").
 * @param copiedLabel - Tooltip shown after copying (default: "Copied!").
 * @param iconSize - Size of the copy/check icon (default: 14).
 * @param copiedDuration - Milliseconds to stay in copied state (default: 2000).
 */
export function CopyButton({
  value,
  copyLabel = "Copy",
  copiedLabel = "Copied!",
  iconSize = 14,
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
    <Tooltip label={copied ? copiedLabel : copyLabel} withArrow>
      <ActionIcon
        aria-label={copied ? copiedLabel : copyLabel}
        color={copied ? "green" : "gray"}
        onClick={handleCopy}
        size={size}
        variant={variant}
        {...props}
      >
        {copied ? <IconCheck size={iconSize} /> : <IconCopy size={iconSize} />}
      </ActionIcon>
    </Tooltip>
  );
}
