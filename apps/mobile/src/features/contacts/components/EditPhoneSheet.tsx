import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { IconCheck, IconPhonePlus, IconTrash } from "@tabler/icons-react-native";
import type { PhoneEntry } from "@bondery/schemas";
import { CONTACT_CHANNEL_TYPE_OPTIONS, TELEPHONE_PREFIX_OPTIONS, countryCodes } from "@bondery/helpers";
import { phoneEntrySchema, phoneEntrySheetSchema } from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetPhoneField, SheetSelectField } from "../../../components/form";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { createDraftPhone } from "../contactChannelConstants";
import { TelephonePrefixFlag } from "./TelephonePrefixFlag";

type SheetMode = "add" | "edit";

interface EditPhoneSheetProps {
  open: boolean;
  mode: SheetMode;
  initialEntry: PhoneEntry | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: (entry: PhoneEntry) => void;
  onDelete?: () => void;
}

export function EditPhoneSheet({
  open,
  mode,
  initialEntry,
  isSubmitting,
  onOpenChange,
  onCancel,
  onSave,
  onDelete,
}: EditPhoneSheetProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useSheetForm({
    open,
    schema: phoneEntrySheetSchema,
    getDefaultValues: () => {
      const entry = initialEntry ?? createDraftPhone();
      return {
        prefix: entry.prefix || "+1",
        value: entry.value || "",
        type: (entry.type === "work" ? "work" : "home") as "home" | "work",
      };
    },
    mode: "onChange",
  });

  const prefixOptions = useMemo(() => {
    const namesByDialCode = new Map(
      countryCodes.map((country) => [country.dialCode.replace(/-\d+$/, ""), country.name]),
    );

    return TELEPHONE_PREFIX_OPTIONS.map((option) => ({
      value: option.value,
      label: option.value,
      leftSection: <TelephonePrefixFlag flag={option.flag} />,
      searchKeywords: `${option.value} ${option.flag} ${namesByDialCode.get(option.value) ?? ""}`,
    }));
  }, []);

  const typeOptions = useMemo(
    () =>
      CONTACT_CHANNEL_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.value === "work" ? t("ContactInfo.TypeWork") : t("ContactInfo.TypeHome"),
        leftSection: <Text style={styles.typeEmoji}>{option.emoji}</Text>,
      })),
    [t],
  );

  const canSubmit = isValid && !isSubmitting;

  const onSubmit = handleSubmit((values) => {
    const parsed = phoneEntrySchema.parse({
      ...values,
      preferred: initialEntry?.preferred ?? false,
    });
    onSave(parsed);
  });

  const primaryAction = {
    label: mode === "add" ? t("ContactInfo.AddPhone") : "Save changes",
    icon:
      mode === "add" ? (
        <IconPhonePlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    onPress: () => void onSubmit(),
    disabled: !canSubmit,
    loading: isSubmitting,
    tone: "primary" as const,
    variant: "filled" as const,
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit" && onDelete
      ? [
          {
            label: t("ContactInfo.DeleteAction"),
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
      title={mode === "add" ? t("ContactInfo.AddPhone") : t("ContactInfo.PhoneNumbers")}
      actions={actions}
      onOpenChange={onOpenChange}
      onClose={onCancel}
      isBusy={isSubmitting}
    >
      <View style={styles.phoneRow}>
        <SheetSelectField
          control={control}
          name="prefix"
          label={t("ContactInfo.PhonePrefixAccessibilityLabel")}
          accessibilityLabel={t("ContactInfo.PhonePrefixAccessibilityLabel")}
          options={prefixOptions}
          searchable
          searchPlaceholder={t("ContactInfo.PhonePrefixSearchPlaceholder")}
          triggerStyle={styles.prefixTrigger}
        />
        <SheetPhoneField
          control={control}
          name="value"
          prefixName="prefix"
          placeholder={t("ContactInfo.PhonePlaceholder")}
          editable={!isSubmitting}
          autoFocus={open}
          onSubmitEditing={() => void onSubmit()}
          containerStyle={styles.phoneInput}
        />
      </View>

      <SheetSelectField
        control={control}
        name="type"
        label={t("ContactInfo.TypeLabel")}
        options={typeOptions}
      />
    </ActionSheetPopup>
  );
}

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prefixTrigger: {
    width: 108,
    flexShrink: 0,
    paddingHorizontal: 10,
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
  },
  typeEmoji: {
    fontSize: 16,
  },
});
