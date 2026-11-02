"use client";

import { ActionIconButton } from "@bondery/mantine-next";
import type { ChatModelId } from "@bondery/schemas";
import { Box, Group, Textarea, Tooltip } from "@mantine/core";
import { IconArrowUp, IconPlayerStop } from "@tabler/icons-react";
import type { FormEvent, KeyboardEvent, RefObject } from "react";
import { useCurrentLocale } from "@/components/shell/UserLocaleProvider";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";
import { HOTKEYS } from "@/lib/platform/config";
import { dictationLanguageTag } from "@/lib/speech/dictation/dictationLanguage";
import { useDictation } from "@/lib/speech/dictation/useDictation";
import { ChatDictateButton } from "./ChatDictateButton";
import { ChatModelPicker } from "./ChatModelPicker";

export interface ChatComposerProps {
  /** A reply or a pending confirm blocks a new send. */
  canStop: boolean;
  /** Ends a live dictation session when the route or the new-chat counter changes. */
  dictationResetKey: string;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  isNewChat: boolean;
  modelId: ChatModelId;
  onModelChange: (modelId: ChatModelId) => void;
  onStop: () => void;
  onSubmit: (event: FormEvent) => void;
  setValue: (value: string) => void;
  value: string;
}

/** `mod+shift+m` as the field sees it. `mod` is Ctrl on Windows and Linux. */
function isDictateHotkey(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  const parts = HOTKEYS.DICTATE.split("+");
  const key = parts.at(-1)?.toLowerCase();
  if (!key || event.key.toLowerCase() !== key) {
    return false;
  }
  const mod = event.ctrlKey || event.metaKey;
  return mod && event.shiftKey && !event.altKey;
}

/**
 * Message field with the model choice and the send control inside it.
 *
 * The field is a bordered box: the textarea on top, a footer row under it with
 * the picker on the left and Dictate plus Send or Stop on the right. The text
 * never shares a row with a control, so it keeps the full width at one row and
 * at eight.
 *
 * Dictation and Send both produce the message, so they sit together. A mic on
 * the left would read as a setting.
 *
 * Escape also stops a reply, from the parent, because the field is disabled
 * during that turn.
 */
export function ChatComposer({
  canStop,
  disabled,
  dictationResetKey,
  inputRef,
  isNewChat,
  modelId,
  onModelChange,
  onStop,
  onSubmit,
  setValue,
  value,
}: ChatComposerProps) {
  const t = useChatPageTranslations();
  const locale = useCurrentLocale();
  const placeholder = isNewChat ? t("inputPlaceholder") : t("followUpPlaceholder");

  const dictation = useDictation({
    disabled,
    lang: dictationLanguageTag(locale),
    readSelection: () => {
      const element = inputRef.current;
      if (!element) {
        return null;
      }
      return { end: element.selectionEnd, start: element.selectionStart };
    },
    resetKey: dictationResetKey,
    restoreCaret: (index) => {
      const element = inputRef.current;
      if (!element) {
        return;
      }
      element.setSelectionRange(index, index);
    },
    setValue,
    value,
  });

  /**
   * Starts or stops dictation.
   *
   * The browser owns the permission prompt. There is no disclosure step here,
   * because the prompt already asks the user for the microphone.
   */
  const handleDictate = () => {
    // A click on the mic moves focus to the button. Put it back on the field,
    // at the end of the text, before the session reads the caret.
    if (!dictation.active) {
      const element = inputRef.current;
      if (element && document.activeElement !== element) {
        const end = element.value.length;
        element.focus();
        element.setSelectionRange(end, end);
      }
    }
    dictation.toggle();
  };

  const handleFormSubmit = (event: FormEvent) => {
    // Send stays blocked until the user stops dictation. A trailing result
    // would otherwise land on a field the send just cleared.
    if (dictation.active) {
      event.preventDefault();
      return;
    }
    onSubmit(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const { nativeEvent } = event;

    if (isDictateHotkey(event) && !nativeEvent.isComposing && !nativeEvent.repeat) {
      event.preventDefault();
      handleDictate();
      return;
    }

    if (event.key !== "Enter" || event.shiftKey || nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    if (dictation.active) {
      return;
    }
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <Box
        style={{
          backgroundColor: "var(--input-bg, var(--mantine-color-default))",
          border: "1px solid var(--input-bd, var(--mantine-color-default-border))",
          borderRadius: "var(--mantine-radius-xl)",
          padding: 8,
        }}
      >
        <Textarea
          aria-label={placeholder}
          autoFocus
          autosize
          disabled={disabled}
          maxRows={8}
          minRows={1}
          onChange={(event) => {
            // A typed character is a second writer. The session ends, and the
            // typed text stays.
            dictation.cancel();
            setValue(event.currentTarget.value);
          }}
          onKeyDown={handleKeyDown}
          p="4px 8px"
          placeholder={placeholder}
          ref={inputRef}
          resize="none"
          styles={{ input: { backgroundColor: "transparent" } }}
          value={value}
          variant="unstyled"
        />
        <Group align="center" gap="xs" justify="space-between" mt={4} wrap="nowrap">
          <ChatModelPicker disabled={disabled} modelId={modelId} onModelChange={onModelChange} />
          <Group gap={4} wrap="nowrap">
            <ChatDictateButton
              availability={dictation.availability}
              error={dictation.error}
              onClearError={dictation.clearError}
              onToggle={handleDictate}
              pending={dictation.pending}
              status={dictation.status}
            />
            {canStop ? (
              <ActionIconButton
                aria-label={t("stop")}
                icon={<IconPlayerStop />}
                onClick={onStop}
                radius="xl"
                size="md"
                type="button"
                variant="light"
              />
            ) : (
              <Tooltip disabled={!dictation.active} label={t("dictateSendBlocked")}>
                <Box component="span" style={{ display: "inline-flex" }}>
                  <ActionIconButton
                    aria-label={dictation.active ? t("dictateSendBlocked") : t("send")}
                    disabled={disabled || !value.trim() || dictation.active}
                    icon={<IconArrowUp />}
                    radius="xl"
                    size="md"
                    type="submit"
                    variant="filled"
                  />
                </Box>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Box>
    </form>
  );
}
