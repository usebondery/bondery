"use client";

import { Select, Stack, Text } from "@mantine/core";
import { IconHeartHandshake } from "@tabler/icons-react";
import { useCurrentLocale as useLocale } from "@/app/(app)/app/components/UserLocaleProvider";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { KEEP_IN_TOUCH_PRESETS } from "./utils/keepInTouchConfig";

interface KeepInTouchSelectProps {
  ariaLabel?: string;
  /**
   * When true, renders a compact xs select with no label or icon.
   * Use in dense list contexts such as the Keep-in-touch page rows.
   */
  compact?: boolean;
  disabled?: boolean;
  /**
   * When provided (full mode only), shows a "Next due: {date}" hint below the select.
   */
  nextDueDate?: Date | null;
  onChange: (value: string | null) => void;
  /** Current value: frequency days as string (e.g. "7") or "none" */
  value: string | null;
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
  const t = useWebTranslations("KeepInTouch");
  const locale = useLocale();

  const data = [
    ...KEEP_IN_TOUCH_PRESETS.map((p) => ({
      label: t(p.labelKey as Parameters<typeof t>[0]),
      value: p.value,
    })),
    { label: t("FrequencyNone"), value: "none" },
  ];

  const select = (
    <Select
      allowDeselect={false}
      aria-label={ariaLabel}
      data={data}
      disabled={disabled}
      label={compact ? undefined : t("Label")}
      leftSection={<IconHeartHandshake size={compact ? 14 : 16} />}
      onChange={onChange}
      size={compact ? "xs" : undefined}
      value={value ?? "none"}
      w={compact ? 150 : undefined}
    />
  );

  if (compact) {
    return select;
  }

  const formattedNextDue = nextDueDate
    ? new Intl.DateTimeFormat(locale || "en-US", { dateStyle: "short" }).format(nextDueDate)
    : null;

  return (
    <Stack gap={4}>
      {select}
      {formattedNextDue && (
        <Text c="dimmed" size="xs">
          {t("NextDue")}: {formattedNextDue}
        </Text>
      )}
    </Stack>
  );
}
