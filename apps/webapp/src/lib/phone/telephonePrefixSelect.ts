import { TELEPHONE_PREFIX_OPTIONS, type TelephonePrefixOption } from "@bondery/helpers/phone";
import { type ComboboxItem, isOptionsGroup, type OptionsFilter } from "@mantine/core";

/**
 * Mantine renders `label` in the closed input, so the label must be the dial
 * prefix. Country names stay searchable through `filterTelephonePrefixOptions`.
 */
export const TELEPHONE_PREFIX_SELECT_DATA: ReadonlyArray<ComboboxItem> =
  TELEPHONE_PREFIX_OPTIONS.map((option) => ({
    label: option.displayPrefix,
    value: option.value,
  }));

const OPTION_BY_VALUE = new Map<string, TelephonePrefixOption>(
  TELEPHONE_PREFIX_OPTIONS.map((option) => [option.value, option]),
);

export function findTelephonePrefixSelectOption(value: string): TelephonePrefixOption | undefined {
  return OPTION_BY_VALUE.get(value);
}

function matchesPrefixQuery(option: TelephonePrefixOption, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const digits = normalized.replace(/\D/g, "");
  if (digits) {
    return option.value.replace(/\D/g, "").includes(digits);
  }

  return (
    option.label.toLowerCase().includes(normalized) ||
    option.countryCode.toLowerCase() === normalized
  );
}

/**
 * Matches the dial prefix or the country name. Plain substring matching keeps
 * the dial-code order of `TELEPHONE_PREFIX_OPTIONS`.
 */
export const filterTelephonePrefixOptions: OptionsFilter<string> = ({ options, search, limit }) => {
  const items = options.filter((item): item is ComboboxItem => !isOptionsGroup(item));

  return items
    .filter((item) => {
      const option = OPTION_BY_VALUE.get(String(item.value));
      if (!option) {
        return item.label.toLowerCase().includes(search.trim().toLowerCase());
      }

      return matchesPrefixQuery(option, search);
    })
    .slice(0, limit);
};
