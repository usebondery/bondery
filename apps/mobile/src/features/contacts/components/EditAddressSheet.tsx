import {
  buildManualContactAddress,
  GEOCODE_SUGGEST_DEBOUNCE_MS,
  GEOCODE_SUGGEST_MIN_QUERY_LENGTH,
} from "@bondery/helpers/address";
import { CONTACT_ADDRESS_TYPE_OPTIONS } from "@bondery/helpers/contact";
import type { ContactAddressEntry, ContactAddressType } from "@bondery/schemas";
import {
  type ContactAddressSheetOutput,
  contactAddressEntrySchema,
  contactAddressSheetSchema,
} from "@bondery/schemas";
import { FlashList } from "@shopify/flash-list";
import {
  IconCheck,
  IconMapPin,
  IconMapPinCheck,
  IconMapPinPlus,
  IconTrash,
} from "@tabler/icons-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type TextInput, View } from "react-native";
import { useContactAddressTranslations } from "@/lib/i18n/generated/hooks";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import { SheetSelectField, SheetTextField } from "../../../components/form";
import { fetchGeocodeSuggestions } from "../../../lib/api/client";
import { UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { CountryFlag } from "./CountryFlag";

type SheetMode = "add" | "edit";

interface EditAddressSheetProps {
  initialEntry: ContactAddressEntry | null;
  isSubmitting: boolean;
  mode: SheetMode;
  onCancel: () => void;
  onDelete?: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: ContactAddressEntry) => void;
  open: boolean;
}

const SUGGESTION_ROW_HEIGHT = 48;
const SUGGESTIONS_MAX_HEIGHT = 200;

type GeocodeStatus = "idle" | "loading" | "geocoded";

function buildAddressEntry(
  addressText: string,
  nickname: string,
  type: ContactAddressType,
  geocodedSuggestion: ContactAddressEntry | null,
  initialEntry: ContactAddressEntry | null,
): ContactAddressEntry {
  const trimmedNickname = nickname.trim() || null;
  const timezone = initialEntry?.timezone ?? geocodedSuggestion?.timezone ?? null;

  if (!geocodedSuggestion) {
    return buildManualContactAddress({
      label: trimmedNickname,
      timezone,
      type,
      value: addressText,
    });
  }

  const displayValue =
    geocodedSuggestion.addressFormatted || geocodedSuggestion.value || addressText.trim();

  return {
    ...geocodedSuggestion,
    label: trimmedNickname,
    timezone,
    type: type,
    value: displayValue,
  };
}

export function EditAddressSheet({
  open,
  mode,
  initialEntry,
  isSubmitting,
  onOpenChange,
  onCancel,
  onSave,
  onDelete,
}: EditAddressSheetProps) {
  const tContactAddress = useContactAddressTranslations();
  const colors = useMobileThemeColors();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeQueryRef = useRef<string | null>(null);
  const {
    control,
    setValue,
    handleSubmit,
    formState: { isValid },
  } = useSheetForm({
    getDefaultValues: () => {
      const entry = initialEntry;
      return {
        label: entry?.label ?? "",
        type: entry?.type ?? "home",
        value: entry?.addressFormatted ?? entry?.value ?? "",
      };
    },
    mode: "onChange",
    open,
    schema: contactAddressSheetSchema,
  });

  const [suggestions, setSuggestions] = useState<ContactAddressEntry[]>([]);
  const [geocodeStatus, setGeocodeStatus] = useState<GeocodeStatus>("idle");
  const [geocodedSuggestion, setGeocodedSuggestion] = useState<ContactAddressEntry | null>(null);

  const invalidateSuggestionsFetch = useCallback(() => {
    activeQueryRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      invalidateSuggestionsFetch();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }

    const entry = initialEntry;
    setSuggestions([]);
    setGeocodeStatus(entry?.latitude != null ? "geocoded" : "idle");
    setGeocodedSuggestion(null);
  }, [open, initialEntry, invalidateSuggestionsFetch]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open]);

  const fetchSuggestions = useCallback(async (query: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setGeocodeStatus("loading");
      const results = await fetchGeocodeSuggestions(query, "address", controller.signal);
      const isStale = activeQueryRef.current !== query;
      if (isStale) {
        return;
      }
      setSuggestions(results);
      setGeocodeStatus("idle");
    } catch (error) {
      const isAbort =
        controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
      if (isAbort || activeQueryRef.current !== query) {
        return;
      }
      setSuggestions([]);
      setGeocodeStatus("idle");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  function handleAddressChange(text: string) {
    const trimmed = text.trim();
    setGeocodedSuggestion(null);
    setGeocodeStatus("idle");
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeQueryRef.current = null;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (trimmed.length < GEOCODE_SUGGEST_MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      activeQueryRef.current = trimmed;
      void fetchSuggestions(trimmed);
    }, GEOCODE_SUGGEST_DEBOUNCE_MS);
  }

  const handleSelectSuggestion = useCallback(
    (suggestion: ContactAddressEntry) => {
      invalidateSuggestionsFetch();
      setValue("value", suggestion.addressFormatted || suggestion.value, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setGeocodedSuggestion(suggestion);
      setGeocodeStatus("geocoded");
      setSuggestions([]);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    },
    [setValue, invalidateSuggestionsFetch],
  );

  const renderSuggestionItem = useCallback(
    ({ item, index }: { item: ContactAddressEntry; index: number }) => (
      <Pressable
        onPress={() => handleSelectSuggestion(item)}
        style={({ pressed }) => [
          styles.suggestionItem,
          index < suggestions.length - 1 && {
            borderBottomColor: colors.border,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
          pressed && { backgroundColor: colors.surfacePressed },
        ]}
      >
        <CountryFlag countryCode={item.addressCountryCode} />
        <Text numberOfLines={2} style={[styles.suggestionText, { color: colors.textPrimary }]}>
          {item.addressFormatted || item.value}
        </Text>
      </Pressable>
    ),
    [
      colors.border,
      colors.surfacePressed,
      colors.textPrimary,
      handleSelectSuggestion,
      suggestions.length,
    ],
  );

  const suggestionsListHeight = Math.min(
    suggestions.length * SUGGESTION_ROW_HEIGHT,
    SUGGESTIONS_MAX_HEIGHT,
  );

  const canSubmit = isValid && !isSubmitting;
  const onSubmit = handleSubmit((values: ContactAddressSheetOutput) => {
    const entry = buildAddressEntry(
      values.value,
      values.label ?? "",
      values.type,
      geocodedSuggestion,
      initialEntry,
    );
    const parsedEntry = contactAddressEntrySchema.parse(entry);
    onSave(parsedEntry);
  });

  const typeOptions = CONTACT_ADDRESS_TYPE_OPTIONS.map((option) => ({
    label:
      option.value === "work"
        ? tContactAddress("TypeWork")
        : option.value === "other"
          ? tContactAddress("TypeOther")
          : tContactAddress("TypeHome"),
    leftSection: <Text style={styles.typeEmoji}>{option.emoji}</Text>,
    value: option.value,
  }));

  const geocodeTrailingIcon =
    geocodeStatus === "loading" ? (
      <ActivityIndicator color={colors.textMuted} size="small" />
    ) : geocodeStatus === "geocoded" ? (
      <IconMapPinCheck size={18} stroke={colors.primary} />
    ) : null;

  const primaryAction: ActionSheetPopupAction = {
    disabled: !canSubmit,
    icon:
      mode === "add" ? (
        <IconMapPinPlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    label:
      mode === "add" ? tContactAddress("AddAddressAction") : tContactAddress("SaveAddressAction"),
    loading: isSubmitting,
    onPress: () => void onSubmit(),
    tone: "primary",
    variant: "filled",
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit" && onDelete
      ? [
          {
            disabled: isSubmitting,
            icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
            label: tContactAddress("DeleteAction"),
            onPress: onDelete,
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

  return (
    <ActionSheetPopup
      actions={actions}
      isBusy={isSubmitting}
      onClose={onCancel}
      onOpenChange={onOpenChange}
      open={open}
      title={
        mode === "add" ? tContactAddress("AddAddressTitle") : tContactAddress("EditAddressTitle")
      }
    >
      <SheetTextField
        autoCapitalize="words"
        autoCorrect={false}
        control={control}
        editable={!isSubmitting}
        enterKeyHint="search"
        inputRef={inputRef}
        leadingIcon={<IconMapPin size={16} stroke={colors.iconSecondary} />}
        name="value"
        onFieldChange={handleAddressChange}
        placeholder={tContactAddress("LookupPlaceholder")}
        returnKeyType="search"
        showMaxLengthCounter={false}
        trailingAccessory={geocodeTrailingIcon}
      />

      {suggestions.length > 0 ? (
        <View
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              height: suggestionsListHeight,
            },
          ]}
        >
          <FlashList
            data={suggestions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item, index) => `${item.value}-${index}`}
            nestedScrollEnabled
            renderItem={renderSuggestionItem}
          />
        </View>
      ) : null}

      <SheetTextField
        autoCapitalize="words"
        autoCorrect={false}
        control={control}
        editable={!isSubmitting}
        maxLength={64}
        name="label"
        placeholder={tContactAddress("LabelFieldPlaceholder")}
      />

      <SheetSelectField
        control={control}
        label={tContactAddress("TypeLabel")}
        name="type"
        options={typeOptions}
      />
    </ActionSheetPopup>
  );
}

const styles = StyleSheet.create({
  suggestionIcon: {
    flexShrink: 0,
    marginTop: 2,
  },
  suggestionItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionsContainer: {
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    overflow: "hidden",
  },
  suggestionText: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
  },
  typeEmoji: {
    fontSize: 16,
  },
});
