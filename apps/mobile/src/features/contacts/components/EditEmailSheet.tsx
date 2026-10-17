import { CONTACT_CHANNEL_TYPE_OPTIONS } from "@bondery/helpers";
import type { EmailEntry } from "@bondery/schemas";
import { emailEntryInputSchema, emailEntrySchema } from "@bondery/schemas";
import { IconCheck, IconMailPlus, IconTrash } from "@tabler/icons-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import { useCommonTranslations, useContactInfoTranslations } from "@/lib/i18n/generated/hooks";
import { SheetSelectField, SheetTextField } from "../../../components/form";
import { Sheet, type SheetAction } from "../../../components/ui/Sheet";
import { UI_TIMING_MS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { useSheetLocalSubmit } from "../../../lib/forms/useSheetLocalSubmit";
import type { NativeTextInputRef } from "../../../lib/native-host-refs";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { createDraftEmail } from "../contactChannelConstants";

type SheetMode = "add" | "edit";

type EmailFormValues = {
  type: "home" | "work";
  value: string;
};

interface EditEmailSheetProps {
  initialEntry: EmailEntry | null;
  mode: SheetMode;
  onCancel: () => void;
  onDelete?: () => void;
  onError?: (error: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onPersist: (entry: EmailEntry) => void;
  open: boolean;
}

export function EditEmailSheet({
  open,
  mode,
  initialEntry,
  onOpenChange,
  onCancel,
  onPersist,
  onDelete,
  onError,
}: EditEmailSheetProps) {
  const tContactInfo = useContactInfoTranslations();
  const tCommon = useCommonTranslations();
  const colors = useMobileThemeColors();
  const inputRef = useRef<NativeTextInputRef>(null);
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

  const typeOptions = CONTACT_CHANNEL_TYPE_OPTIONS.map((option) => ({
    label: option.value === "work" ? tContactInfo("TypeWork") : tContactInfo("TypeHome"),
    leftSection: <Text style={styles.typeEmoji}>{option.emoji}</Text>,
    value: option.value,
  }));

  function handleCloseSheet() {
    onOpenChange(false);
  }

  function performSave(values: EmailFormValues) {
    const parsed = emailEntrySchema.parse({
      ...values,
      preferred: initialEntry?.preferred ?? false,
    });
    onPersist(parsed);
    return parsed;
  }

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
        <IconMailPlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    label: mode === "add" ? tContactInfo("AddEmail") : "Save changes",
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
      title={mode === "add" ? tContactInfo("AddEmail") : tContactInfo("EmailAddresses")}
    >
      <SheetTextField
        autoCapitalize="none"
        autoCorrect={false}
        control={control}
        editable={!isBusy}
        enterKeyHint="done"
        inputRef={inputRef}
        keyboardType="email-address"
        name="value"
        onSubmitEditing={submit}
        placeholder={tContactInfo("EmailPlaceholder")}
        returnKeyType="done"
      />

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
  typeEmoji: {
    fontSize: 16,
  },
});
