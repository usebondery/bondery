"use client";

import {
  DatePickerWithPresets as DatePickerWithPresetsBase,
  type DatePickerWithPresetsProps as DatePickerWithPresetsBaseProps,
} from "@bondery/mantine-next";
import { useInteractionsPageTranslations } from "@/lib/i18n/generated/hooks";

type DatePickerWithPresetsProps = Omit<DatePickerWithPresetsBaseProps, "presetLabels">;

/**
 * Webapp date picker. Supplies Interactions page preset labels to the shared picker.
 */
export function DatePickerWithPresets(props: DatePickerWithPresetsProps) {
  const t = useInteractionsPageTranslations();

  return (
    <DatePickerWithPresetsBase
      {...props}
      presetLabels={{
        lastMonth: t("DatePresetLastMonth"),
        lastWeek: t("DatePresetLastWeek"),
        lastYear: t("DatePresetLastYear"),
        today: t("DatePresetToday"),
        tomorrow: t("DatePresetTomorrow"),
        yesterday: t("DatePresetYesterday"),
      }}
    />
  );
}
