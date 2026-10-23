import { createContactFromFullNameSchema } from "@bondery/helpers/forms";
import type { Contact } from "@bondery/schemas";
import { createContactInputSchema } from "@bondery/schemas";
import { IconUserPlus } from "@tabler/icons-react-native";
import { useRef } from "react";
import { StyleSheet, Text } from "react-native";
import { useMobileCreateContactTranslations } from "@/lib/i18n/generated/hooks";
import { SheetTextField } from "../../../components/form";
import { BottomSheetScrollView, Sheet } from "../../../components/ui/Sheet";
import { createContact } from "../../../lib/domains/contacts";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useSheetLocalSubmit } from "../../../lib/forms/useSheetLocalSubmit";
import type { NativeTextInputRef } from "../../../lib/native-host-refs";
import { useAppNavigation } from "../../../lib/navigation/useAppNavigation";
import { useSheetInputAutofocus } from "../../../lib/sheets/useSheetInputAutofocus";
import { useShowErrorToast } from "../../../lib/toast/useShowErrorToast";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface CreateContactSheetProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * Bottom sheet for creating a contact from a single full-name field.
 */
export function CreateContactSheet({ open, onOpenChange }: CreateContactSheetProps) {
  const tMobileCreateContact = useMobileCreateContactTranslations();
  const { openContact } = useAppNavigation();
  const colors = useMobileThemeColors();
  const showErrorToast = useShowErrorToast();
  const inputRef = useRef<NativeTextInputRef>(null);
  const pendingNavigateContactIdRef = useRef<string | null>(null);
  const onSnapIndexChange = useSheetInputAutofocus(open, inputRef);

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useSheetForm({
    getDefaultValues: () => ({ fullName: "" }),
    mode: "onChange",
    open,
    schema: createContactInputSchema,
  });

  function handleCreateError(createError: unknown) {
    showErrorToast(createError, tMobileCreateContact("ErrorTitle"));
  }

  function handleCloseSheet() {
    onOpenChange(false);
  }

  function performCreate({ fullName }: { fullName: string }) {
    const parsed = createContactFromFullNameSchema.parse({ fullName });
    return createContact({
      firstName: parsed.firstName,
      lastName: parsed.lastName ?? undefined,
      middleName: parsed.middleName ?? undefined,
    });
  }

  function handleCreateSuccess(contact: Contact) {
    pendingNavigateContactIdRef.current = contact.id;
  }

  function handleSheetDismissed() {
    const contactId = pendingNavigateContactIdRef.current;
    if (!contactId) {
      return;
    }
    pendingNavigateContactIdRef.current = null;
    const outcome = openContact(contactId);
    if (outcome !== "executed" && typeof __DEV__ !== "undefined" && __DEV__) {
      // biome-ignore lint/suspicious/noConsole: Development diagnostics explain dropped navigation.
      console.info(`[CreateContactSheet] navigation dropped (${outcome}): /contact/${contactId}`);
    }
  }

  const { isSubmitting, submit } = useSheetLocalSubmit(handleSubmit, {
    onClose: handleCloseSheet,
    onError: handleCreateError,
    onSuccess: handleCreateSuccess,
    perform: performCreate,
  });

  const canSubmit = isValid && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    pendingNavigateContactIdRef.current = null;
    onOpenChange(false);
  };

  const createActionIcon = <IconUserPlus color={colors.textOnPrimary} size={16} />;

  return (
    <Sheet
      actions={[
        {
          disabled: !canSubmit,
          icon: createActionIcon,
          label: tMobileCreateContact("Create"),
          loading: isSubmitting,
          loadingText: tMobileCreateContact("Creating"),
          onPress: submit,
          tone: "primary",
          variant: "filled",
        },
      ]}
      isBusy={isSubmitting}
      onClose={handleClose}
      onDismissed={handleSheetDismissed}
      onSnapIndexChange={onSnapIndexChange}
      opened={open}
      snapPoint="fit"
      title={tMobileCreateContact("Title")}
    >
      <BottomSheetScrollView keyboardShouldPersistTaps="handled">
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
              submit();
            }
          }}
          placeholder={tMobileCreateContact("FullNamePlaceholder")}
          returnKeyType="done"
        />
      </BottomSheetScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
