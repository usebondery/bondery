"use client";

import { Autocomplete, Group } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { IconCompass } from "@tabler/icons-react";
import { GEOCODE_SUGGEST_MIN_QUERY_LENGTH } from "@bondery/helpers/address";
import {
  geocodeSuggestionDisplayKey,
  geocodeSuggestionDisplayLabel,
} from "@bondery/helpers/geocode";
import type { ContactAddressEntry } from "@bondery/schemas";
import { DEBOUNCE_MS } from "@/lib/config";
import { fetchGeocodeSuggestions } from "@/lib/geocode";

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
  onSuggestionSelect: (item: ContactAddressEntry) => void;
  onBlur?: () => void;
}

function getSuggestionCountryFlag(entry: ContactAddressEntry): string {
  const iso = entry.addressCountryCode?.toLowerCase();
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
  const suggestionsByLabel = useRef<Record<string, ContactAddressEntry>>({});
  const optionFlagByLabel = useRef<Record<string, string>>({});
  /** Tracks whether the user has actively changed the input value. */
  const userHasTyped = useRef(false);
  const activeQueryRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync the flag when value changes externally (e.g. after enrichment invalidates contact data)
  useEffect(() => {
    if (!userHasTyped.current) {
      setSelectedFlag(extractCountryCodeFromLabel(value));
    }
  }, [value]);

  useEffect(() => {
    // Skip the initial API call when the component mounts with a pre-populated value.
    // Only start fetching suggestions after the user types.
    if (!userHasTyped.current) return;

    const timeoutId = setTimeout(() => {
      const text = value.trim();
      if (text.length < GEOCODE_SUGGEST_MIN_QUERY_LENGTH) {
        setOptions([]);
        suggestionsByLabel.current = {};
        optionFlagByLabel.current = {};
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeQueryRef.current = text;

      void (async () => {
        setLoading(true);
        try {
          const items = await fetchGeocodeSuggestions(text, mode, controller.signal);
          if (activeQueryRef.current !== text) {
            return;
          }

          const dictionary: Record<string, ContactAddressEntry> = {};
          const flags: Record<string, string> = {};
          const labels: string[] = [];

          for (const item of items) {
            const displayLabel = geocodeSuggestionDisplayLabel(item);
            dictionary[displayLabel] = item;
            flags[displayLabel] = getSuggestionCountryFlag(item);
            labels.push(displayLabel);
          }

          suggestionsByLabel.current = dictionary;
          optionFlagByLabel.current = flags;
          setOptions(labels);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          if (activeQueryRef.current === text) {
            setOptions([]);
            suggestionsByLabel.current = {};
            optionFlagByLabel.current = {};
          }
        } finally {
          if (activeQueryRef.current === text) {
            setLoading(false);
          }
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        }
      })();
    }, DEBOUNCE_MS.locationSuggest);

    return () => {
      clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
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

// Re-export for consumers that need stable suggestion keys
export { geocodeSuggestionDisplayKey, geocodeSuggestionDisplayLabel };
