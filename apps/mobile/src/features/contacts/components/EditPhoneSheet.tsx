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
import { useCommonTranslations, useContactInfoTranslations } from "@/lib/i18n/generated/hooks";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import { SheetPhoneField, SheetSelectField } from "../../../components/form";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
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
  const tContactInfo = useContactInfoTranslations();
  const _t = useCommonTranslations();
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
    label: mode === "add" ? tContactInfo("AddPhone") : "Save changes",
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
            label: tContactInfo("DeleteAction"),
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
          autoFocus={open}
          containerStyle={styles.phoneInput}
          control={control}
          editable={!isSubmitting}
          name="value"
          onSubmitEditing={() => void onSubmit()}
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
