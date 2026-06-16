"use client";

import { Autocomplete, Group } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { getMapSuggestions, type MapSuggestionItem } from "@/app/(app)/app/map/actions";
import { IconCompass } from "@tabler/icons-react";
import { DEBOUNCE_MS } from "@/lib/config";

interface LocationLookupInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  disabled?: boolean;
  ariaLabel?: string;
  style?: React.CSSProperties;
  /** "place" shows only city/region/country suggestions (e.g. for a person's LinkedIn-style location field).
   *  "address" (default) also includes streets and full addresses. */
  mode?: "place" | "address";
  onChange: (value: string) => void;
  onSuggestionSelect: (item: MapSuggestionItem) => void;
  onBlur?: () => void;
}

function getSuggestionCountryFlag(item: MapSuggestionItem): string {
  const countryEntry = item.regionalStructure.find((entry) => entry.type === "regional.country");
  const iso = countryEntry?.isoCode?.toLowerCase();
  return iso && iso.length === 2 ? iso : "aq";
}

/**
 * Extracts a 2-letter ISO country code from a formatted location label
 * produced by {@link formatPlaceLabel} (e.g. "Ann Arbor, Michigan, US" → "us").
 * Returns `null` when the last segment isn't a valid-looking country code.
 */
function extractCountryCodeFromLabel(label: string): string | null {
  const lastSegment = label.split(",").pop()?.trim().toLowerCase();
  return lastSegment && /^[a-z]{2}$/.test(lastSegment) ? lastSegment : null;
}

export function LocationLookupInput({
  label,
  placeholder,
  value,
  disabled,
  ariaLabel,
  style,
  mode = "address",
  onChange,
  onSuggestionSelect,
  onBlur,
}: LocationLookupInputProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(() =>
    extractCountryCodeFromLabel(value),
  );
  const [loading, setLoading] = useState(false);
  const suggestionsByLabel = useRef<Record<string, MapSuggestionItem>>({});
  const optionFlagByLabel = useRef<Record<string, string>>({});
  /** Tracks whether the user has actively changed the input value. */
  const userHasTyped = useRef(false);

  // Sync the flag when value changes externally (e.g. after enrichment / router.refresh())
  useEffect(() => {
    if (!userHasTyped.current) {
      setSelectedFlag(extractCountryCodeFromLabel(value));
    }
  }, [value]);

  useEffect(() => {
    // Skip the initial API call when the component mounts with a pre-populated value.
    // Only start fetching suggestions after the user types.
    if (!userHasTyped.current) return;

    const timeoutId = setTimeout(async () => {
      const text = value.trim();
      if (text.length < 2) {
        setOptions([]);
        suggestionsByLabel.current = {};
        optionFlagByLabel.current = {};
        return;
      }

      setLoading(true);
      const items = await getMapSuggestions(text, mode);
      const dictionary: Record<string, MapSuggestionItem> = {};
      for (const item of items) {
        dictionary[item.label] = item;
      }

      suggestionsByLabel.current = dictionary;
      optionFlagByLabel.current = Object.fromEntries(
        Object.entries(dictionary).map(([label, item]) => [label, getSuggestionCountryFlag(item)]),
      );
      setOptions(Object.keys(dictionary));
      setLoading(false);
    }, DEBOUNCE_MS.locationSuggest);

    return () => clearTimeout(timeoutId);
  }, [value, mode]);

  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      style={style}
      aria-label={ariaLabel}
      leftSection={<IconCompass size={16} />}
      rightSection={
        selectedFlag ? (
          <span className={`fi fi-${selectedFlag}`} style={{ width: 18 }} />
        ) : undefined
      }
      rightSectionPointerEvents="none"
      loading={loading}
      onChange={(v) => {
        userHasTyped.current = true;
        onChange(v);
        setSelectedFlag(optionFlagByLabel.current[v] ?? null);
      }}
      data={options}
      onOptionSubmit={(selectedLabel) => {
        const selected = suggestionsByLabel.current[selectedLabel];
        if (!selected) return;

        onChange(selectedLabel);
        setSelectedFlag(optionFlagByLabel.current[selectedLabel] ?? null);
        onSuggestionSelect(selected);
      }}
      onBlur={onBlur}
      filter={({ options: inputOptions }) => inputOptions}
      renderOption={({ option }) => (
        <Group gap="xs" wrap="nowrap">
          <span
            className={`fi fi-${optionFlagByLabel.current[option.value] || "aq"}`}
            style={{ width: 18, flexShrink: 0 }}
          />
          <span>{option.value}</span>
        </Group>
      )}
    />
  );
}
