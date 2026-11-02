"use client";

import { DescribedSelect } from "@bondery/mantine-next";
import type { ChatModelId } from "@bondery/schemas";
import { IconChevronDown } from "@tabler/icons-react";
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
} from "@/lib/chat/chatModelPreference";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";
import { ChatModelMark } from "./ChatModelMark";

/** Model display names. Brand names stay literal, like other product names. */
const MODEL_LABELS: Record<ChatModelId, string> = {
  "anthropic/claude-haiku-5.5": "Haiku",
  "anthropic/claude-sonnet-5.5": "Sonnet",
  auto: "Auto",
};

/** Short line under each name. Explains the trade without a model card. */
const MODEL_HINTS: Record<ChatModelId, "modelAutoHint" | "modelHaikuHint" | "modelSonnetHint"> = {
  "anthropic/claude-haiku-5.5": "modelHaikuHint",
  "anthropic/claude-sonnet-5.5": "modelSonnetHint",
  auto: "modelAutoHint",
};

export interface ChatModelPickerProps {
  disabled?: boolean;
  modelId: ChatModelId;
  onModelChange: (modelId: ChatModelId) => void;
}

/**
 * Model choice for the next message, inside the composer.
 *
 * The closed field stays a compact borderless control: the mark, the name, and
 * a chevron. The list is a `DescribedSelect`, so the rows match every other
 * value picker. Haiku and Sonnet share the Anthropic mark, so the name is what
 * tells them apart.
 */
export function ChatModelPicker({
  disabled = false,
  modelId,
  onModelChange,
}: ChatModelPickerProps) {
  const t = useChatPageTranslations();
  const selected = CHAT_MODEL_OPTIONS.find((option) => option.id === modelId);
  const selectedId = selected?.id ?? DEFAULT_CHAT_MODEL_ID;

  return (
    <DescribedSelect
      allowDeselect={false}
      aria-label={t("modelPickerLabel", { model: MODEL_LABELS[selectedId] })}
      comboboxProps={{ position: "top-start", shadow: "md", width: 260, withArrow: true }}
      data={CHAT_MODEL_OPTIONS.map((option) => ({
        badge: option.version,
        description: t(MODEL_HINTS[option.id]),
        label: MODEL_LABELS[option.id],
        leftSection: <ChatModelMark modelId={option.id} size={16} />,
        value: option.id,
      }))}
      disabled={disabled}
      leftSection={<ChatModelMark modelId={selectedId} />}
      leftSectionWidth={22}
      onChange={(next) => {
        if (next && isChatModelId(next)) {
          onModelChange(next);
        }
      }}
      rightSection={<IconChevronDown size={12} />}
      rightSectionPointerEvents="none"
      rightSectionWidth={16}
      size="xs"
      styles={{
        input: {
          color: "var(--mantine-color-dimmed)",
          fieldSizing: "content",
          height: 28,
          minHeight: 28,
        },
        root: { flex: "0 0 auto" },
        wrapper: { width: "auto" },
      }}
      value={selectedId}
      variant="unstyled"
      w="auto"
    />
  );
}

export { MODEL_LABELS };
