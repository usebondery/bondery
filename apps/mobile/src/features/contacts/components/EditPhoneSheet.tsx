import {
  CONTACT_CHANNEL_TYPE_OPTIONS,
  countryCodes,
  TELEPHONE_PREFIX_OPTIONS,
} from "@bondery/helpers";
import type { PhoneEntry } from "@bondery/schemas";
import { phoneEntrySchema, phoneEntrySheetSchema } from "@bondery/schemas";
import { IconCheck, IconPhonePlus, IconTrash } from "@tabler/icons-react-native";
import { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useCommonTranslations, useContactInfoTranslations } from "@/lib/i18n/generated/hooks";
import { SheetPhoneField, SheetSelectField } from "../../../components/form";
import { Sheet, type SheetAction } from "../../../components/ui/Sheet";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { useSheetLocalSubmit } from "../../../lib/forms/useSheetLocalSubmit";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { createDraftPhone } from "../contactChannelConstants";
import { TelephonePrefixFlag } from "./TelephonePrefixFlag";

type SheetMode = "add" | "edit";

type PhoneFormValues = {
  prefix: string;
  type: "home" | "work";
  value: string;
};

interface EditPhoneSheetProps {
  initialEntry: PhoneEntry | null;
  mode: SheetMode;
  onCancel: () => void;
  onDelete?: () => void;
  onError?: (error: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onPersist: (entry: PhoneEntry) => void;
  open: boolean;
}

export function EditPhoneSheet({
  open,
  mode,
  initialEntry,
  onOpenChange,
  onCancel,
  onPersist,
  onDelete,
  onError,
}: EditPhoneSheetProps) {
  const tContactInfo = useContactInfoTranslations();
  const tCommon = useCommonTranslations();
  const colors = useMobileThemeColors();
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useSheetForm({
    getDefaultValues: () => {
      const entry = initialEntry ?? createDraftPhone();
      return {
        prefix: entry.prefix || "+1",
        type: (entry.type === "work" ? "work" : "home") as "home" | "work",
        value: entry.value || "",
      };
    },
    mode: "onChange",
    open,
    schema: phoneEntrySheetSchema,
  });

  const prefixOptions = useMemo(() => {
    const namesByDialCode = new Map(
      countryCodes.map((country) => [country.dialCode.replace(/-\d+$/, ""), country.name]),
    );

    return TELEPHONE_PREFIX_OPTIONS.map((option) => ({
      label: option.value,
      leftSection: <TelephonePrefixFlag flag={option.flag} />,
      searchKeywords: `${option.value} ${option.flag} ${namesByDialCode.get(option.value) ?? ""}`,
      value: option.value,
    }));
  }, []);

  const typeOptions = useMemo(
    () =>
      CONTACT_CHANNEL_TYPE_OPTIONS.map((option) => ({
        label: option.value === "work" ? tContactInfo("TypeWork") : tContactInfo("TypeHome"),
        leftSection: <Text style={styles.typeEmoji}>{option.emoji}</Text>,
        value: option.value,
      })),
    [tContactInfo],
  );

  const handleCloseSheet = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const performSave = useCallback(
    (values: PhoneFormValues) => {
      const parsed = phoneEntrySchema.parse({
        ...values,
        preferred: initialEntry?.preferred ?? false,
      });
      onPersist(parsed);
      return parsed;
    },
    [initialEntry?.preferred, onPersist],
  );

  const { isSubmitting, submit } = useSheetLocalSubmit(handleSubmit, {
    onClose: handleCloseSheet,
    onError,
    perform: performSave,
  });

  const { isSubmitting: isDeleting, submit: submitDelete } = useSheetLocalAction({
    onClose: handleCloseSheet,
    onError,
    perform: () => {
      if (!onDelete) {
        throw new Error("Delete handler missing");
      }
      onDelete();
    },
  });

  const isBusy = isSubmitting || isDeleting;
  const canSubmit = isValid && !isBusy;

  const primaryAction = {
    disabled: !canSubmit,
    icon:
      mode === "add" ? (
        <IconPhonePlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    label: mode === "add" ? tContactInfo("AddPhone") : "Save changes",
    loading: isSubmitting,
    loadingText: tCommon("feedback.saving"),
    onPress: submit,
    tone: "primary" as const,
    variant: "filled" as const,
  };

  const actions: [SheetAction] | [SheetAction, SheetAction] =
    mode === "edit" && onDelete
      ? [
          {
            disabled: isBusy,
            icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
            label: tContactInfo("DeleteAction"),
            loading: isDeleting,
            loadingText: tCommon("feedback.deleting"),
            onPress: submitDelete,
            tone: "danger",
            variant: "filled",
          },
          primaryAction,
        ]
      : [primaryAction];

  return (
    <Sheet
      actions={actions}
      isBusy={isBusy}
      onClose={onCancel}
      opened={open}
      title={mode === "add" ? tContactInfo("AddPhone") : tContactInfo("PhoneNumbers")}
    >
      <View style={styles.phoneRow}>
        <SheetSelectField
          accessibilityLabel={tContactInfo("PhonePrefixAccessibilityLabel")}
          control={control}
          label={tContactInfo("PhonePrefixAccessibilityLabel")}
          name="prefix"
          options={prefixOptions}
          searchable
          searchPlaceholder={tContactInfo("PhonePrefixSearchPlaceholder")}
          triggerStyle={styles.prefixTrigger}
        />

        <SheetPhoneField
          control={control}
          editable={!isBusy}
          name="value"
          onSubmitEditing={submit}
          placeholder={tContactInfo("PhonePlaceholder")}
          prefixName="prefix"
        />
      </View>

      <SheetSelectField
        control={control}
        label={tContactInfo("TypeLabel")}
        name="type"
        options={typeOptions}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  phoneRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  prefixTrigger: {
    flexShrink: 0,
    width: 108,
  },
  typeEmoji: {
    fontSize: 16,
  },
});
