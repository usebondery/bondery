import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, type TextInput } from "react-native";
import { IconCheck, IconMailPlus, IconTrash } from "@tabler/icons-react-native";
import type { EmailEntry } from "@bondery/schemas";
import { CONTACT_CHANNEL_TYPE_OPTIONS } from "@bondery/helpers";
import { emailEntryInputSchema, emailEntrySchema } from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetSelectField, SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { createDraftEmail } from "../contactChannelConstants";

type SheetMode = "add" | "edit";

interface EditEmailSheetProps {
  open: boolean;
  mode: SheetMode;
  initialEntry: EmailEntry | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: (entry: EmailEntry) => void;
  onDelete?: () => void;
}

export function EditEmailSheet({
  open,
  mode,
  initialEntry,
  isSubmitting,
  onOpenChange,
  onCancel,
  onSave,
  onDelete,
}: EditEmailSheetProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const inputRef = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useSheetForm({
    open,
    schema: emailEntryInputSchema.pick({ value: true, type: true }),
    getDefaultValues: () => {
      const entry = initialEntry ?? createDraftEmail();
      return {
        value: entry.value || "",
        type: (entry.type === "work" ? "work" : "home") as "home" | "work",
      };
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open]);

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
    const parsed = emailEntrySchema.parse({
      ...values,
      preferred: initialEntry?.preferred ?? false,
    });
    onSave(parsed);
  });

  const primaryAction = {
    label: mode === "add" ? t("ContactInfo.AddEmail") : "Save changes",
    icon:
      mode === "add" ? (
        <IconMailPlus size={16} stroke={colors.textOnPrimary} />
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
      title={mode === "add" ? t("ContactInfo.AddEmail") : t("ContactInfo.EmailAddresses")}
      actions={actions}
      onOpenChange={onOpenChange}
      onClose={onCancel}
      isBusy={isSubmitting}
    >
      <SheetTextField
        control={control}
        name="value"
        inputRef={inputRef}
        placeholder={t("ContactInfo.EmailPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!isSubmitting}
        returnKeyType="done"
        enterKeyHint="done"
        onSubmitEditing={() => void onSubmit()}
      />

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
  typeEmoji: {
    fontSize: 16,
  },
});
