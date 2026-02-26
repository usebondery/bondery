"use client";

import { Autocomplete, Group } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { getMapSuggestions, type MapSuggestionItem } from "@/app/(app)/app/map/actions";
import { IconCompass } from "@tabler/icons-react";

interface LocationLookupInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  disabled?: boolean;
  ariaLabel?: string;
  style?: React.CSSProperties;
  onChange: (value: string) => void;
  onSuggestionSelect: (item: MapSuggestionItem) => void;
}

function getSuggestionCountryFlag(item: MapSuggestionItem): string {
  const countryEntry = item.regionalStructure.find((entry) => entry.type === "regional.country");
  const iso = countryEntry?.isoCode?.toLowerCase();
  return iso && iso.length === 2 ? iso : "aq";
}

export function LocationLookupInput({
  label,
  placeholder,
  value,
  disabled,
  ariaLabel,
  style,
  onChange,
  onSuggestionSelect,
}: LocationLookupInputProps) {
  const [options, setOptions] = useState<string[]>([]);
  const suggestionsByLabel = useRef<Record<string, MapSuggestionItem>>({});
  const optionFlagByLabel = useRef<Record<string, string>>({});

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const text = value.trim();
      if (text.length < 2) {
        setOptions([]);
        suggestionsByLabel.current = {};
        optionFlagByLabel.current = {};
        return;
      }

      const items = await getMapSuggestions(text);
      const dictionary: Record<string, MapSuggestionItem> = {};
      for (const item of items) {
        dictionary[item.label] = item;
      }

      suggestionsByLabel.current = dictionary;
      optionFlagByLabel.current = Object.fromEntries(
        Object.entries(dictionary).map(([label, item]) => [label, getSuggestionCountryFlag(item)]),
      );
      setOptions(Object.keys(dictionary));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      style={style}
      aria-label={ariaLabel}
      leftSection={<IconCompass size={16} />}
      onChange={onChange}
      data={options}
      onOptionSubmit={(selectedLabel) => {
        const selected = suggestionsByLabel.current[selectedLabel];
        if (!selected) return;

        onChange(selectedLabel);
        onSuggestionSelect(selected);
      }}
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
