import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, type TextInput } from "react-native";
import { IconUserPlus } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { createContactInputSchema } from "@bondery/schemas";
import type { Contact } from "@bondery/schemas";
import { createContactFromFullNameSchema } from "@bondery/helpers/forms";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { contactsDomain } from "../../../lib/domains/contacts";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface CreateContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: Contact) => void;
}

/**
 * Bottom sheet for creating a contact from a single full-name field.
 */
export function CreateContactSheet({ open, onOpenChange, onCreated }: CreateContactSheetProps) {
  const t = useMobileTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const inputRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = useSheetForm({
    open,
    schema: createContactInputSchema,
    getDefaultValues: () => ({ fullName: "" }),
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open]);

  const canSubmit = isDirty && isValid && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  const onSubmit = handleSubmit(async ({ fullName }) => {
    const parsed = createContactFromFullNameSchema.parse({ fullName });

    try {
      const contact = contactsDomain.create({
        firstName: parsed.firstName,
        middleName: parsed.middleName ?? undefined,
        lastName: parsed.lastName ?? undefined,
      });

      onOpenChange(false);
      onCreated(contact);
      router.push({ pathname: "/contact/[id]", params: { id: contact.id } });
    } catch (createError) {
      const message =
        createError instanceof Error && createError.message.trim().length > 0
          ? createError.message
          : t("MobileApp.CreateContact.ErrorDescription");

      showToast({
        type: "error",
        headline: t("MobileApp.CreateContact.ErrorTitle"),
        description: message,
      });
    }
  });

  const createActionIcon = useMemo(
    () => <IconUserPlus size={16} color={colors.textOnPrimary} />,
    [colors.textOnPrimary],
  );

  return (
    <ActionSheetPopup
      open={open}
      title={t("MobileApp.CreateContact.Title")}
      actions={[
        {
          label: t("MobileApp.CreateContact.Create"),
          icon: createActionIcon,
          onPress: () => void onSubmit(),
          disabled: !canSubmit,
          loading: isSubmitting,
          tone: "primary",
          variant: "filled",
        },
      ]}
      onOpenChange={onOpenChange}
      onClose={handleClose}
      isBusy={isSubmitting}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t("MobileApp.CreateContact.FullNameLabel")}
      </Text>

      <SheetTextField
        control={control}
        name="fullName"
        inputRef={inputRef}
        placeholder={t("MobileApp.CreateContact.FullNamePlaceholder")}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        enterKeyHint="done"
        onSubmitEditing={() => {
          if (canSubmit) void onSubmit();
        }}
        editable={!isSubmitting}
      />
    </ActionSheetPopup>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
