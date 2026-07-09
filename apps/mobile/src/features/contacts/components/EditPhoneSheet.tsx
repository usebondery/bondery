import {
  CONTACT_CHANNEL_TYPE_OPTIONS,
  countryCodes,
  TELEPHONE_PREFIX_OPTIONS,
} from "@bondery/helpers";
import type { PhoneEntry } from "@bondery/schemas";
import { phoneEntrySchema, phoneEntrySheetSchema } from "@bondery/schemas";
import { IconCheck, IconPhonePlus, IconTrash } from "@tabler/icons-react-native";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import { SheetPhoneField, SheetSelectField } from "../../../components/form";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { createDraftPhone } from "../contactChannelConstants";
import { TelephonePrefixFlag } from "./TelephonePrefixFlag";

type SheetMode = "add" | "edit";

interface EditPhoneSheetProps {
  initialEntry: PhoneEntry | null;
  isSubmitting: boolean;
  mode: SheetMode;
  onCancel: () => void;
  onDelete?: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: PhoneEntry) => void;
  open: boolean;
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
        label:
          option.value === "work"
            ? t("TypeWork", { ns: "ContactInfo" })
            : t("TypeHome", { ns: "ContactInfo" }),
        leftSection: <Text style={styles.typeEmoji}>{option.emoji}</Text>,
        value: option.value,
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
    disabled: !canSubmit,
    icon:
      mode === "add" ? (
        <IconPhonePlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    label: mode === "add" ? t("AddPhone", { ns: "ContactInfo" }) : "Save changes",
    loading: isSubmitting,
    onPress: () => void onSubmit(),
    tone: "primary" as const,
    variant: "filled" as const,
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit" && onDelete
      ? [
          {
            disabled: isSubmitting,
            icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
            label: t("DeleteAction", { ns: "ContactInfo" }),
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
        mode === "add"
          ? t("AddPhone", { ns: "ContactInfo" })
          : t("PhoneNumbers", { ns: "ContactInfo" })
      }
    >
      <View style={styles.phoneRow}>
        <SheetSelectField
          accessibilityLabel={t("PhonePrefixAccessibilityLabel", { ns: "ContactInfo" })}
          control={control}
          label={t("PhonePrefixAccessibilityLabel", { ns: "ContactInfo" })}
          name="prefix"
          options={prefixOptions}
          searchable
          searchPlaceholder={t("PhonePrefixSearchPlaceholder", { ns: "ContactInfo" })}
          triggerStyle={styles.prefixTrigger}
        />
        <SheetPhoneField
          autoFocus={open}
          containerStyle={styles.phoneInput}
          control={control}
          editable={!isSubmitting}
          name="value"
          onSubmitEditing={() => void onSubmit()}
          placeholder={t("PhonePlaceholder", { ns: "ContactInfo" })}
          prefixName="prefix"
        />
      </View>

      <SheetSelectField
        control={control}
        label={t("TypeLabel", { ns: "ContactInfo" })}
        name="type"
        options={typeOptions}
      />
    </ActionSheetPopup>
  );
}

const styles = StyleSheet.create({
  phoneInput: {
    flex: 1,
    minWidth: 0,
  },
  phoneRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  prefixTrigger: {
    flexShrink: 0,
    paddingHorizontal: 10,
    width: 108,
  },
  typeEmoji: {
    fontSize: 16,
  },
});
