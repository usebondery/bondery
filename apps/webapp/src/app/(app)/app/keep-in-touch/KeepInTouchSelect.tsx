"use client";

import { Select, Stack, Text } from "@mantine/core";
import { IconHeartHandshake } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { KEEP_IN_TOUCH_PRESETS } from "./keepInTouchConfig";

interface KeepInTouchSelectProps {
  /** Current value: frequency days as string (e.g. "7") or "none" */
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /**
   * When true, renders a compact xs select with no label or icon.
   * Use in dense list contexts such as the Keep-in-touch page rows.
   */
  compact?: boolean;
  /**
   * When provided (full mode only), shows a "Next due: {date}" hint below the select.
   */
  nextDueDate?: Date | null;
  ariaLabel?: string;
}

/**
 * A localised select for choosing a keep-in-touch frequency preset.
 *
 * @param compact  - When true renders an xs select without label or icon.
 * @param nextDueDate - Optional next due date shown as a hint in full mode.
 */
export function KeepInTouchSelect({
  value,
  onChange,
  disabled,
  compact = false,
  nextDueDate,
  ariaLabel,
}: KeepInTouchSelectProps) {
  const t = useTranslations("KeepInTouch");
  const locale = useLocale();

  const data = [
    ...KEEP_IN_TOUCH_PRESETS.map((p) => ({
      value: p.value,
      label: t(p.labelKey as Parameters<typeof t>[0]),
    })),
    { value: "none", label: t("FrequencyNone") },
  ];

  const select = (
    <Select
      label={compact ? undefined : t("Label")}
      leftSection={<IconHeartHandshake size={compact ? 14 : 16} />}
      size={compact ? "xs" : undefined}
      w={compact ? 150 : undefined}
      allowDeselect={false}
      value={value ?? "none"}
      data={data}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );

  if (compact) return select;

  const formattedNextDue = nextDueDate
    ? new Intl.DateTimeFormat(locale || "en-US", { dateStyle: "short" }).format(nextDueDate)
    : null;

  return (
    <Stack gap={4}>
      {select}
      {formattedNextDue && (
        <Text size="xs" c="dimmed">
          {t("NextDue")}: {formattedNextDue}
        </Text>
      )}
    </Stack>
  );
}
