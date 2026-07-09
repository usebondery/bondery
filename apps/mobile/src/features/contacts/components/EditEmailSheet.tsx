import { CONTACT_CHANNEL_TYPE_OPTIONS } from "@bondery/helpers";
import type { EmailEntry } from "@bondery/schemas";
import { emailEntryInputSchema, emailEntrySchema } from "@bondery/schemas";
import { IconCheck, IconMailPlus, IconTrash } from "@tabler/icons-react-native";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, type TextInput } from "react-native";
import {
  ActionSheetPopup,
  type ActionSheetPopupAction,
} from "../../../components/ActionSheetPopup";
import { SheetSelectField, SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { createDraftEmail } from "../contactChannelConstants";

type SheetMode = "add" | "edit";

interface EditEmailSheetProps {
  initialEntry: EmailEntry | null;
  isSubmitting: boolean;
  mode: SheetMode;
  onCancel: () => void;
  onDelete?: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: EmailEntry) => void;
  open: boolean;
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
    getDefaultValues: () => {
      const entry = initialEntry ?? createDraftEmail();
      return {
        type: (entry.type === "work" ? "work" : "home") as "home" | "work",
        value: entry.value || "",
      };
    },
    mode: "onChange",
    open,
    schema: emailEntryInputSchema.pick({ type: true, value: true }),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open]);

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
    const parsed = emailEntrySchema.parse({
      ...values,
      preferred: initialEntry?.preferred ?? false,
    });
    onSave(parsed);
  });

  const primaryAction = {
    disabled: !canSubmit,
    icon:
      mode === "add" ? (
        <IconMailPlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    label: mode === "add" ? t("AddEmail", { ns: "ContactInfo" }) : "Save changes",
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
          ? t("AddEmail", { ns: "ContactInfo" })
          : t("EmailAddresses", { ns: "ContactInfo" })
      }
    >
      <SheetTextField
        autoCapitalize="none"
        autoCorrect={false}
        control={control}
        editable={!isSubmitting}
        enterKeyHint="done"
        inputRef={inputRef}
        keyboardType="email-address"
        name="value"
        onSubmitEditing={() => void onSubmit()}
        placeholder={t("EmailPlaceholder", { ns: "ContactInfo" })}
        returnKeyType="done"
      />

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
  typeEmoji: {
    fontSize: 16,
  },
});
