"use client";

import { Group, TextInput, type TextInputProps } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { type FocusEvent, type ReactElement, useState } from "react";
import { ActionIconButton } from "#ActionIconButton/index.js";
import { resolveCopyableInputType } from "#CopyableInput/inputType.js";
import { CopyButton } from "#CopyButton/index.js";

/** Width of one right-section button (`xs` action icon plus gap) in px. */
const BUTTON_SLOT_PX = 30;
const SECTION_PADDING_PX = 6;

interface CopyableInputProps
  extends Omit<
    TextInputProps,
    | "classNames"
    | "label"
    | "onFocus"
    | "readOnly"
    | "rightSection"
    | "rightSectionWidth"
    | "type"
    | "value"
  > {
  copiedLabel?: string;
  copyLabel?: string;
  /** Accessible label of the reveal button while the value is visible. */
  hideLabel?: string;
  /** Show the read-only value in a monospace font. Use it for URLs, hosts and codes. */
  isMonospace?: boolean;
  /** Mask the value and add a show/hide button. Copy still copies the real value. */
  isSecret?: boolean;
  label: string;
  /** Called after the value reaches the clipboard. */
  onCopied?: () => void;
  /** Accessible label of the reveal button while the value is hidden. */
  showLabel?: string;
  value: string;
}

/**
 * A read-only input with a copy button. Focus selects the whole value, so a reader
 * can also copy it by hand. With `isSecret` the value is masked and a toggle reveals it.
 */
function CopyableInput({
  copiedLabel,
  copyLabel,
  hideLabel = "Hide",
  isMonospace = false,
  isSecret = false,
  onCopied,
  showLabel = "Show",
  value,
  ...inputProps
}: CopyableInputProps): ReactElement {
  const [isRevealed, setIsRevealed] = useState(false);

  function selectAll(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.select();
  }

  const buttonCount = isSecret ? 2 : 1;

  return (
    <TextInput
      {...inputProps}
      classNames={isMonospace ? { input: "copyableInputMonospace" } : undefined}
      onFocus={selectAll}
      readOnly
      rightSection={
        <Group gap={0} wrap="nowrap">
          {isSecret ? (
            <ActionIconButton
              aria-label={isRevealed ? hideLabel : showLabel}
              aria-pressed={isRevealed}
              color="gray"
              icon={isRevealed ? <IconEyeOff /> : <IconEye />}
              onClick={() => setIsRevealed((current) => !current)}
              size="xs"
              variant="subtle"
            />
          ) : null}
          <CopyButton
            copiedLabel={copiedLabel}
            copyLabel={copyLabel}
            onCopied={onCopied}
            value={value}
          />
        </Group>
      }
      rightSectionWidth={buttonCount * BUTTON_SLOT_PX + SECTION_PADDING_PX}
      type={resolveCopyableInputType(isSecret, isRevealed)}
      value={value}
    />
  );
}

export { CopyableInput, type CopyableInputProps };
