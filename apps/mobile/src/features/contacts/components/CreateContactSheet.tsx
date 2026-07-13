import { createContactFromFullNameSchema } from "@bondery/helpers/forms";
import type { Contact } from "@bondery/schemas";
import { createContactInputSchema } from "@bondery/schemas";
import { IconUserPlus } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, type TextInput } from "react-native";
import { useMobileCreateContactTranslations } from "@/lib/i18n/generated/hooks";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { SheetTextField } from "../../../components/form";
import { UI_TIMING_MS } from "../../../lib/config";
import { createContact } from "../../../lib/domains/contacts";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { preloadMobileNamespaces } from "../../../lib/i18n/preloadMobileNamespaces";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface CreateContactSheetProps {
  onCreated: (contact: Contact) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * Bottom sheet for creating a contact from a single full-name field.
 */
export function CreateContactSheet({ open, onOpenChange, onCreated }: CreateContactSheetProps) {
  const tMobileCreateContact = useMobileCreateContactTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const inputRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = useSheetForm({
    getDefaultValues: () => ({ fullName: "" }),
    mode: "onChange",
    open,
    schema: createContactInputSchema,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    void preloadMobileNamespaces(["mobile.createContact"]);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [open]);

  const canSubmit = isDirty && isValid && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onOpenChange(false);
  };

  const onSubmit = handleSubmit(async ({ fullName }) => {
    const parsed = createContactFromFullNameSchema.parse({ fullName });

    try {
      const contact = createContact({
        firstName: parsed.firstName,
        lastName: parsed.lastName ?? undefined,
        middleName: parsed.middleName ?? undefined,
      });

      onOpenChange(false);
      onCreated(contact);
      router.push({ params: { id: contact.id }, pathname: "/contact/[id]" });
    } catch (createError) {
      const message =
        createError instanceof Error && createError.message.trim().length > 0
          ? createError.message
          : tMobileCreateContact("ErrorDescription");

      showToast({
        description: message,
        headline: tMobileCreateContact("ErrorTitle"),
        type: "error",
      });
    }
  });

  const createActionIcon = useMemo(
    () => <IconUserPlus color={colors.textOnPrimary} size={16} />,
    [colors.textOnPrimary],
  );

  return (
    <ActionSheetPopup
      actions={[
        {
          disabled: !canSubmit,
          icon: createActionIcon,
          label: tMobileCreateContact("Create"),
          loading: isSubmitting,
          onPress: () => void onSubmit(),
          tone: "primary",
          variant: "filled",
        },
      ]}
      isBusy={isSubmitting}
      onClose={handleClose}
      onOpenChange={onOpenChange}
      open={open}
      title={tMobileCreateContact("Title")}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {tMobileCreateContact("FullNameLabel")}
      </Text>

      <SheetTextField
        autoCapitalize="words"
        autoCorrect={false}
        control={control}
        editable={!isSubmitting}
        enterKeyHint="done"
        inputRef={inputRef}
        name="fullName"
        onSubmitEditing={() => {
          if (canSubmit) {
            void onSubmit();
          }
        }}
        placeholder={tMobileCreateContact("FullNamePlaceholder")}
        returnKeyType="done"
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
