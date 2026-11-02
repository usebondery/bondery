"use client";

import { ActionIconButton, errorNotificationTemplate } from "@bondery/mantine-next";
import type { TranslateFn } from "@bondery/translations";
import { Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLoader, IconPlayerPause, IconPlayerPlay, IconVolume } from "@tabler/icons-react";
import { useEffect } from "react";
import { useChatPageTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import type { SpeechStatus } from "@/lib/speech/useSpeechReader";
import { clearSpeechError, useSpeechReader } from "@/lib/speech/useSpeechReader";

interface ChatMessageSpeakButtonProps {
  messageId: string;
  /** Builds the spoken text and the language tag. Runs on click. */
  prepare: () => Promise<{ lang: string; text: string }>;
}

function speakIcon(status: SpeechStatus) {
  switch (status) {
    case "preparing":
      return <IconLoader className="animate-spin" />;
    case "speaking":
      return <IconPlayerPause />;
    case "paused":
      return <IconPlayerPlay />;
    case "idle":
      return <IconVolume />;
  }
}

type ChatCopy = TranslateFn<"ChatPage">;

/** Tooltip and `aria-label` for the current state. Unsupported wins. */
function speakLabel(status: SpeechStatus, supported: boolean, t: ChatCopy): string {
  if (!supported) {
    return t("speakUnsupported");
  }
  switch (status) {
    case "preparing":
      return t("speakPreparing");
    case "speaking":
      return t("speakPause");
    case "paused":
      return t("speakResume");
    case "idle":
      return t("speakMessage");
  }
}

/**
 * Read-aloud control for one assistant message.
 *
 * Mirrors `CopyButton`: a `Tooltip` around a subdued `xs` icon button. The icon
 * and the `aria-label` follow the reader state, so a screen reader hears Pause
 * only while that message speaks.
 *
 * The disabled state uses `aria-disabled`, because a `disabled` button does not
 * fire the pointer events a tooltip needs. That matches the map controls.
 */
export function ChatMessageSpeakButton({ messageId, prepare }: ChatMessageSpeakButtonProps) {
  const t = useChatPageTranslations();
  const tCommon = useCommonTranslations();
  const { error, status, supported, toggle } = useSpeechReader(messageId, prepare);

  useEffect(() => {
    if (!error) {
      return;
    }
    notifications.show(
      errorNotificationTemplate({
        description: t("speakError"),
        title: tCommon("feedback.errorTitle"),
      }),
    );
    // One toast per failure. The next click starts a fresh attempt.
    clearSpeechError();
  }, [error, t, tCommon]);

  const isPreparing = status === "preparing";
  const isUnsupported = !supported;
  const isBlocked = isPreparing || isUnsupported;

  const label = speakLabel(status, supported, t);

  return (
    <Tooltip label={label}>
      <ActionIconButton
        aria-disabled={isBlocked || undefined}
        aria-label={label}
        className="no-scale"
        color="gray"
        icon={speakIcon(status)}
        onClick={isBlocked ? undefined : toggle}
        size="xs"
        style={
          isBlocked
            ? { cursor: "not-allowed", opacity: "var(--mantine-opacity-disabled, 0.5)" }
            : undefined
        }
        variant="subtle"
      />
    </Tooltip>
  );
}
