import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  IconCheck,
  IconMapPin,
  IconMapPinCheck,
  IconMapPinPlus,
  IconTrash,
} from "@tabler/icons-react-native";
import type { ContactAddressEntry, ContactAddressType } from "@bondery/schemas";
import {
  buildManualContactAddress,
  GEOCODE_SUGGEST_DEBOUNCE_MS,
  GEOCODE_SUGGEST_MIN_QUERY_LENGTH,
} from "@bondery/helpers/address";
import { CONTACT_ADDRESS_TYPE_OPTIONS } from "@bondery/helpers/contact";
import {
  contactAddressEntrySchema,
  contactAddressSheetSchema,
  type ContactAddressSheetOutput,
} from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetSelectField, SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { fetchGeocodeSuggestions } from "../../../lib/api/client";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { CountryFlag } from "./CountryFlag";

type SheetMode = "add" | "edit";

interface EditAddressSheetProps {
  open: boolean;
  mode: SheetMode;
  initialEntry: ContactAddressEntry | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: (entry: ContactAddressEntry) => void;
  onDelete?: () => void;
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
      value: addressText,
      type,
      label: trimmedNickname,
      timezone,
    });
  }

  const displayValue = geocodedSuggestion.addressFormatted || geocodedSuggestion.value || addressText.trim();

  return {
    ...geocodedSuggestion,
    value: displayValue,
    type: type,
    label: trimmedNickname,
    timezone,
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
  const t = useMobileTranslations();
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
    open,
    schema: contactAddressSheetSchema,
    getDefaultValues: () => {
      const entry = initialEntry;
      return {
        value: entry?.addressFormatted ?? entry?.value ?? "",
        label: entry?.label ?? "",
        type: entry?.type ?? "home",
      };
    },
    mode: "onChange",
  });

  const [suggestions, setSuggestions] = useState<ContactAddressEntry[]>([]);
  const [geocodeStatus, setGeocodeStatus] = useState<GeocodeStatus>("idle");
  const [geocodedSuggestion, setGeocodedSuggestion] = useState<ContactAddressEntry | null>(null);

  function invalidateSuggestionsFetch() {
    activeQueryRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }

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
  }, [open, initialEntry]);

  useEffect(() => {
    if (!open) return;

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

  const handleSelectSuggestion = useCallback((suggestion: ContactAddressEntry) => {
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
  }, [setValue]);

  const renderSuggestionItem = useCallback(
    ({ item, index }: { item: ContactAddressEntry; index: number }) => (
      <Pressable
        onPress={() => handleSelectSuggestion(item)}
        style={({ pressed }) => [
          styles.suggestionItem,
          index < suggestions.length - 1 && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
          pressed && { backgroundColor: colors.surfacePressed },
        ]}
      >
        <CountryFlag countryCode={item.addressCountryCode} />
        <Text style={[styles.suggestionText, { color: colors.textPrimary }]} numberOfLines={2}>
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
    const entry = buildAddressEntry(values.value, values.label ?? "", values.type, geocodedSuggestion, initialEntry);
    const parsedEntry = contactAddressEntrySchema.parse(entry);
    onSave(parsedEntry);
  });

  const typeOptions = CONTACT_ADDRESS_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label:
      option.value === "work"
        ? t("ContactAddress.TypeWork")
        : option.value === "other"
          ? t("ContactAddress.TypeOther")
          : t("ContactAddress.TypeHome"),
    leftSection: <Text style={styles.typeEmoji}>{option.emoji}</Text>,
  }));

  const geocodeTrailingIcon =
    geocodeStatus === "loading" ? (
      <ActivityIndicator size="small" color={colors.textMuted} />
    ) : geocodeStatus === "geocoded" ? (
      <IconMapPinCheck size={18} stroke={colors.primary} />
    ) : null;

  const primaryAction: ActionSheetPopupAction = {
    label: mode === "add" ? t("ContactAddress.AddAddressAction") : t("ContactAddress.SaveAddressAction"),
    icon:
      mode === "add" ? (
        <IconMapPinPlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    onPress: () => void onSubmit(),
    disabled: !canSubmit,
    loading: isSubmitting,
    tone: "primary",
    variant: "filled",
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit" && onDelete
      ? [
          {
            label: t("ContactAddress.DeleteAction"),
            icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
            onPress: onDelete,
            disabled: isSubmitting,
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

  return (
    <ActionSheetPopup
      open={open}
      title={mode === "add" ? t("ContactAddress.AddAddressTitle") : t("ContactAddress.EditAddressTitle")}
      actions={actions}
      onOpenChange={onOpenChange}
      onClose={onCancel}
      isBusy={isSubmitting}
    >
      <SheetTextField
        control={control}
        name="value"
        inputRef={inputRef}
        onFieldChange={handleAddressChange}
        placeholder={t("ContactAddress.LookupPlaceholder")}
        leadingIcon={<IconMapPin size={16} stroke={colors.iconSecondary} />}
        trailingAccessory={geocodeTrailingIcon}
        editable={!isSubmitting}
        returnKeyType="search"
        enterKeyHint="search"
        autoCorrect={false}
        autoCapitalize="words"
        showMaxLengthCounter={false}
      />

      {suggestions.length > 0 ? (
        <View
          style={[
            styles.suggestionsContainer,
            { backgroundColor: colors.surface, borderColor: colors.border, height: suggestionsListHeight },
          ]}
        >
          <FlashList
            data={suggestions}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            keyboardShouldPersistTaps="handled"
            renderItem={renderSuggestionItem}
            nestedScrollEnabled
          />
        </View>
      ) : null}

      <SheetTextField
        control={control}
        name="label"
        placeholder={t("ContactAddress.LabelFieldPlaceholder")}
        editable={!isSubmitting}
        maxLength={64}
        autoCorrect={false}
        autoCapitalize="words"
      />

      <SheetSelectField
        control={control}
        name="type"
        label={t("ContactAddress.TypeLabel")}
        options={typeOptions}
      />
    </ActionSheetPopup>
  );
}

const styles = StyleSheet.create({
  suggestionsContainer: {
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionIcon: {
    marginTop: 2,
    flexShrink: 0,
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
