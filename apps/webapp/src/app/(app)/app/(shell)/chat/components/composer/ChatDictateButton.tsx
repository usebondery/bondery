"use client";

import { ActionIconButton, errorNotificationTemplate } from "@bondery/mantine-next";
import type { PrefixedKeys } from "@bondery/translations";
import { Tooltip } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconLoader,
  IconMicrophone,
  IconMicrophoneFilled,
  IconMicrophoneOff,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { useChatPageTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import type { DictationAvailability } from "@/lib/speech/dictation/dictationAvailability";
import type { DictationErrorCode } from "@/lib/speech/dictation/dictationEngine";
import type { DictationStatus } from "@/lib/speech/dictation/useDictation";

/** A leaf key of the `ChatPage` namespace. Literal, so `t` keeps its overloads. */
type ChatKey = PrefixedKeys<"ChatPage">;

interface ChatDictateButtonProps {
  /** `null` until the browser check has run. */
  availability: DictationAvailability | null;
  /** One failure code. The button shows a toast, then clears it. */
  error: DictationErrorCode | null;
  onClearError: () => void;
  onToggle: () => void;
  /** True until the speech route is known. The control shows a loader. */
  pending: boolean;
  /** The status the control shows. `insecure` availability overrides it. */
  status: DictationStatus;
}

/** Tooltip key per status. The `aria-label` and the tooltip always agree. */
const LABEL_KEY: Record<DictationStatus, ChatKey> = {
  busy: "dictateBusy",
  denied: "dictateDenied",
  failed: "dictateFailed",
  finalizing: "dictateFinishing",
  idle: "dictateStart",
  listening: "dictateStop",
  "no-service": "dictateNoService",
  offline: "dictateOffline",
  requesting: "dictateRequesting",
  "service-off": "dictateServiceOff",
  unavailable: "dictateNoMicrophone",
};

/**
 * Toast text per failure code.
 *
 * `unsupported` cannot reach this control, because the control is hidden
 * without a recognizer. It maps to the generic failure text, so the record
 * stays exhaustive.
 */
const ERROR_KEY: Record<DictationErrorCode, ChatKey> = {
  insecure: "dictateInsecure",
  "language-not-supported": "dictateLanguageUnsupported",
  "microphone-busy": "dictateBusy",
  network: "dictateNetwork",
  "no-microphone": "dictateNoMicrophone",
  "no-service": "dictateNoService",
  "not-allowed": "dictateDenied",
  offline: "dictateOffline",
  "service-failed": "dictateFailed",
  "service-not-allowed": "dictateServiceOff",
  unsupported: "dictateFailed",
};

/**
 * Statuses with no action. Both are transient, so a click would be ignored.
 *
 * Every other status takes a click and retries.
 */
const BLOCKED_STATUSES: ReadonlySet<DictationStatus> = new Set([
  "denied",
  "finalizing",
  "no-service",
  "requesting",
]);

/** Statuses that show the crossed-out microphone. */
const OFF_STATUSES: ReadonlySet<DictationStatus> = new Set([
  "busy",
  "denied",
  "no-service",
  "offline",
  "service-off",
  "unavailable",
]);

/**
 * Microphone control for the composer footer.
 *
 * The icon, the tooltip, and the `aria-label` follow one state, so a screen
 * reader hears "Stop dictation" only while a session runs.
 *
 * A blocked control uses `aria-disabled` plus `onClick={undefined}`, because a
 * `disabled` button fires no pointer events and the tooltip never shows. That
 * matches `ChatMessageSpeakButton`. `data-disabled` keeps the press scale off
 * without that pointer-event cut.
 */
export function ChatDictateButton({
  availability,
  error,
  pending,
  status,
  onClearError,
  onToggle,
}: ChatDictateButtonProps) {
  const t = useChatPageTranslations();
  const tCommon = useCommonTranslations();
  const os = useOs();

  // One toast per failure, then the code is cleared. A second failure shows a
  // second toast, and the next attempt starts clean.
  useEffect(() => {
    if (!error) {
      return;
    }
    notifications.show(
      errorNotificationTemplate({
        description: t(ERROR_KEY[error]),
        title: tCommon("feedback.errorTitle"),
      }),
    );
    onClearError();
  }, [error, onClearError, t, tCommon]);

  const isInsecure = availability === "insecure";
  const isUnsupported = availability === "unsupported";
  const isLoading = os === "undetermined" || pending;
  const isBlocked = !isLoading && (isInsecure || isUnsupported || BLOCKED_STATUSES.has(status));
  const isListening = !isBlocked && status === "listening";
  const isSpinning = !isBlocked && (status === "requesting" || status === "finalizing");
  // Requesting, listening, and finishing all hold the microphone.
  const isActive = isListening || isSpinning;

  let label = t(LABEL_KEY[status]);
  if (isInsecure) {
    label = t("dictateInsecure");
  } else if (isUnsupported || status === "no-service") {
    label = t("dictateNoService");
  }

  let icon = <IconMicrophone />;
  if (isSpinning) {
    icon = <IconLoader className="animate-spin" />;
  } else if (isListening) {
    icon = <IconMicrophoneFilled />;
  } else if (isInsecure || isUnsupported || OFF_STATUSES.has(status)) {
    icon = <IconMicrophoneOff />;
  }

  return (
    <Tooltip label={label}>
      <ActionIconButton
        aria-disabled={isBlocked || undefined}
        aria-label={label}
        color={isActive ? "branding-primary" : "gray"}
        data-disabled={isBlocked || undefined}
        icon={icon}
        loading={isLoading}
        onClick={isBlocked || isLoading ? undefined : onToggle}
        radius="xl"
        size="md"
        style={
          isBlocked
            ? { cursor: "not-allowed", opacity: "var(--mantine-opacity-disabled, 0.5)" }
            : undefined
        }
        type="button"
        variant={isActive ? "light" : "subtle"}
      />
    </Tooltip>
  );
}
