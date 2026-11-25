"use client";

import { GEOCODE_SUGGEST_MIN_QUERY_LENGTH } from "@bondery/helpers/address";
import { detachPromise } from "@bondery/helpers/async";
import {
  geocodeSuggestionDisplayKey,
  geocodeSuggestionDisplayLabel,
} from "@bondery/helpers/geocode";
import type { ContactAddressEntry } from "@bondery/schemas";
import { Autocomplete, Group } from "@mantine/core";
import { IconCompass } from "@tabler/icons-react";
import { cn } from "cn";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { fetchGeocodeSuggestions } from "@/lib/api/geocode";
import { DEBOUNCE_MS } from "@/lib/platform/config";

const A_Z_2 = /^[a-z]{2}$/u;

interface LocationLookupInputProps {
  ariaLabel?: string;
  disabled?: boolean;
  label?: string;
  /** Defaults to compass. Pass a magnifying glass for map/search chrome. */
  leftSection?: ReactNode;
  /** "place" shows only city/region/country suggestions (e.g. for a person's LinkedIn-style location field).
   *  "address" (default) also includes streets and full addresses. */
  mode?: "place" | "address";
  onBlur?: () => void;
  onChange: (value: string) => void;
  onSuggestionSelect: (item: ContactAddressEntry) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  value: string;
}

function flagIconClass(code: string): string {
  return `fi-${code}`;
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
  return lastSegment && A_Z_2.test(lastSegment) ? lastSegment : null;
}

export function LocationLookupInput({
  label,
  placeholder,
  value,
  disabled,
  ariaLabel,
  leftSection,
  style,
  mode = "address",
  onChange,
  onSuggestionSelect,
  onBlur,
}: LocationLookupInputProps) {
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(() =>
    extractCountryCodeFromLabel(value),
  );
  const [loading, setLoading] = useState(false);
  const suggestionsByKeyRef = useRef<Record<string, ContactAddressEntry>>({});
  const optionFlagByKeyRef = useRef<Record<string, string>>({});
  const optionTextByKeyRef = useRef<Record<string, string>>({});
  const optionFlagByLabelRef = useRef<Record<string, string>>({});
  /** Tracks whether the user has actively changed the input value. */
  const userHasTypedRef = useRef<boolean>(false);
  const activeQueryRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync the flag when value changes externally (e.g. after enrichment invalidates contact data)
  useEffect(() => {
    if (!userHasTypedRef.current) {
      setSelectedFlag(extractCountryCodeFromLabel(value));
    }
  }, [value]);

  useEffect(() => {
    // Skip the initial API call when the component mounts with a pre-populated value.
    // Only start fetching suggestions after the user types.
    if (!userHasTypedRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const text = value.trim();
      if (text.length < GEOCODE_SUGGEST_MIN_QUERY_LENGTH) {
        setOptions([]);
        suggestionsByKeyRef.current = {};
        optionFlagByKeyRef.current = {};
        optionFlagByLabelRef.current = {};
        optionTextByKeyRef.current = {};
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeQueryRef.current = text;

      detachPromise(
        (async () => {
          setLoading(true);
          try {
            const items = await fetchGeocodeSuggestions(text, mode, controller.signal);
            if (activeQueryRef.current !== text) {
              return;
            }

            const dictionary: Record<string, ContactAddressEntry> = {};
            const flags: Record<string, string> = {};
            const flagsByLabel: Record<string, string> = {};
            const textsByKey: Record<string, string> = {};
            const labels: Array<{ label: string; value: string }> = [];
            const seen = new Set<string>();

            for (const item of items) {
              const displayLabel = geocodeSuggestionDisplayLabel(item);
              const key = geocodeSuggestionDisplayKey(item);
              if (seen.has(key)) {
                continue;
              }
              seen.add(key);
              const flag = getSuggestionCountryFlag(item);
              dictionary[key] = item;
              flags[key] = flag;
              flagsByLabel[displayLabel] ??= flag;
              textsByKey[key] = displayLabel;
              labels.push({ label: displayLabel, value: key });
            }

            suggestionsByKeyRef.current = dictionary;
            optionFlagByKeyRef.current = flags;
            optionFlagByLabelRef.current = flagsByLabel;
            optionTextByKeyRef.current = textsByKey;
            setOptions(labels);
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              return;
            }
            if (activeQueryRef.current === text) {
              setOptions([]);
              suggestionsByKeyRef.current = {};
              optionFlagByKeyRef.current = {};
              optionFlagByLabelRef.current = {};
              optionTextByKeyRef.current = {};
            }
          } finally {
            if (activeQueryRef.current === text) {
              setLoading(false);
            }
            if (abortControllerRef.current === controller) {
              abortControllerRef.current = null;
            }
          }
        })(),
      );
    }, DEBOUNCE_MS.locationSuggest);

    return () => {
      clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
  }, [value, mode]);

  return (
    <Autocomplete
      aria-label={ariaLabel}
      data={options}
      disabled={disabled}
      filter={({ options: inputOptions }) => inputOptions}
      label={label}
      leftSection={leftSection ?? <IconCompass size={16} />}
      loading={loading}
      onBlur={onBlur}
      onChange={(v) => {
        userHasTypedRef.current = true;
        onChange(v);
        setSelectedFlag(optionFlagByLabelRef.current[v] ?? null);
      }}
      onOptionSubmit={(selectedKey) => {
        const selected = suggestionsByKeyRef.current[selectedKey];
        if (!selected) {
          return;
        }

        onChange(geocodeSuggestionDisplayLabel(selected));
        setSelectedFlag(optionFlagByKeyRef.current[selectedKey] ?? null);
        onSuggestionSelect(selected);
      }}
      placeholder={placeholder}
      renderOption={({ option }) => (
        <Group gap="xs" wrap="nowrap">
          <span
            className={cn("fi", flagIconClass(optionFlagByKeyRef.current[option.value] || "aq"))}
            style={{ flexShrink: 0, width: 18 }}
          />
          <span>{optionTextByKeyRef.current[option.value] ?? option.value}</span>
        </Group>
      )}
      rightSection={
        selectedFlag ? (
          <span className={cn("fi", flagIconClass(selectedFlag))} style={{ width: 18 }} />
        ) : undefined
      }
      rightSectionPointerEvents="none"
      style={style}
      value={value}
    />
  );
}

// Re-export for consumers that need stable suggestion keys
export {
  geocodeSuggestionDisplayKey,
  geocodeSuggestionDisplayLabel,
} from "@bondery/helpers/geocode";
