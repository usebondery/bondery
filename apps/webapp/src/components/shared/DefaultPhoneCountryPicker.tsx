"use client";

import { filterBySearchQuery } from "@bondery/helpers";
import {
  findTelephonePrefixOption,
  getTelephonePrefixSearchTexts,
  localizeTelephonePrefixLabel,
  TELEPHONE_PREFIX_OPTIONS,
} from "@bondery/helpers/phone";
import { intlTagForLocale } from "@bondery/schemas/locale";
import { IconPhone } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { SearchableComboboxPicker } from "@/components/shared/SearchableComboboxPicker";
import { SearchableComboboxPickerOption } from "@/components/shared/searchableComboboxItem";
import { useCurrentLocale } from "@/components/shell/localeProvider";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

interface DefaultPhoneCountryPickerProps {
  disabled?: boolean;
  label?: ReactNode;
  onBlur?: (prefix: string) => void;
  onChange: (prefix: string) => void;
  placeholder?: string;
  value: string;
}

export function DefaultPhoneCountryPicker({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
}: DefaultPhoneCountryPickerProps) {
  const t = useSettingsPageTranslations("Preferences");
  const intlTag = intlTagForLocale(useCurrentLocale());
  const selected = findTelephonePrefixOption(value);
  const selectedLabel = selected ? localizeTelephonePrefixLabel(selected, intlTag) : undefined;
  const filteredOptions = (query: string) =>
    filterBySearchQuery(TELEPHONE_PREFIX_OPTIONS, query, (option) =>
      getTelephonePrefixSearchTexts(option, intlTag),
    );

  const searchPlaceholder = placeholder ?? t("DefaultPhoneCountrySearch");

  return (
    <SearchableComboboxPicker
      ariaLabel={typeof label === "string" ? label : undefined}
      disabled={disabled}
      label={label}
      onBlur={onBlur}
      onChange={onChange}
      renderOptions={({ query, selectedValue }) =>
        filteredOptions(query).map((option) => (
          <SearchableComboboxPickerOption
            flag={option.flag}
            isSelected={option.value === selectedValue}
            key={option.value}
            main={option.displayPrefix}
            supporting={localizeTelephonePrefixLabel(option, intlTag)}
            value={option.value}
          />
        ))
      }
      searchPlaceholder={searchPlaceholder}
      targetFallback={value || searchPlaceholder}
      targetItem={
        selected
          ? {
              flag: selected.flag,
              main: selected.displayPrefix,
              supporting: selectedLabel,
            }
          : undefined
      }
      targetLeftSection={<IconPhone size={16} />}
      value={value}
    />
  );
}
