import { shareContactEmailSchema } from "@bondery/schemas";
import { IconPlus, IconSend, IconX } from "@tabler/icons-react-native";
import { type RefObject, useEffect, useRef, useState } from "react";
import { type Control, type FieldErrors, type UseFormSetValue, useWatch } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, type TextInput, View } from "react-native";
import { ActionSheetPopup } from "../../components/ActionSheetPopup";
import { MobileTextInput } from "../../components/MobileTextInput";
import { shareContactEmail } from "../../lib/api/client";
import { UI_TIMING_MS } from "../../lib/config";
import { useSheetForm } from "../../lib/forms/useSheetForm";
import { useMobileShareContactEmailTranslations } from "../../lib/i18n/generated/hooks";
import { preloadMobileNamespaces } from "../../lib/i18n/preloadMobileNamespaces";
import { useAppToast } from "../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TEXT_STYLES, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import {
  buildFinalRecipients,
  formatShareEmailSendButtonLabel,
  isValidRecipientEmail,
  MAX_SHARE_MESSAGE_LENGTH,
  MAX_SHARE_RECIPIENTS,
  MESSAGE_LENGTH_COUNTER_THRESHOLD,
  processRecipientInputChange,
} from "./shareContactEmailUtils";

interface ShareContactEmailSheetProps {
  contactId: string;
  contactName: string;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

type ShareEmailFormValues = {
  recipients: string[];
  message?: string;
};

export function ShareContactEmailSheet({
  open,
  contactId,
  contactName,
  onOpenChange,
  onClose,
}: ShareContactEmailSheetProps) {
  const tMobileShareContactEmail = useMobileShareContactEmailTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const inputRef = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useSheetForm({
    getDefaultValues: () => ({
      message: "",
      recipients: [],
    }),
    mode: "onChange",
    open,
    schema: shareContactEmailSchema,
  });

  const [emailInput, setEmailInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    void preloadMobileNamespaces(["mobile.shareContact"]);
    setEmailInput("");
    setInputError(null);
    setIsSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);
    return () => clearTimeout(timer);
  }, [open]);

  const sendWithValidation = handleSubmit(
    async ({ recipients: finalRecipients, message: formMessage }) => {
      setIsSubmitting(true);

      try {
        await shareContactEmail({
          message: formMessage,
          personId: contactId,
          recipientEmails: finalRecipients,
        });

        showToast({
          description: tMobileShareContactEmail("SuccessDescription"),
          headline: tMobileShareContactEmail("SuccessHeadline"),
          type: "success",
        });
        onClose();
      } catch {
        showToast({
          description: tMobileShareContactEmail("ErrorDescription"),
          headline: tMobileShareContactEmail("ErrorHeadline"),
          type: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  );

  async function handleSend(recipients: string[]) {
    const finalRecipients = buildFinalRecipients(recipients, emailInput);
    setValue("recipients", finalRecipients, { shouldDirty: true, shouldValidate: true });
    await sendWithValidation();
  }

  return (
    <ShareContactEmailSheetContent
      colors={colors}
      contactName={contactName}
      control={control}
      emailInput={emailInput}
      handleSend={handleSend}
      inputError={inputError}
      inputRef={inputRef}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onOpenChange={onOpenChange}
      open={open}
      recipientErrors={errors.recipients}
      setEmailInput={setEmailInput}
      setInputError={setInputError}
      setValue={setValue}
    />
  );
}

function ShareContactEmailSheetContent({
  control,
  setValue,
  handleSend,
  emailInput,
  setEmailInput,
  inputError,
  setInputError,
  isSubmitting,
  inputRef,
  recipientErrors,
  contactName,
  onOpenChange,
  onClose,
  open,
  colors,
}: {
  control: Control<ShareEmailFormValues>;
  setValue: UseFormSetValue<ShareEmailFormValues>;
  handleSend: (recipients: string[]) => Promise<void>;
  emailInput: string;
  setEmailInput: (value: string) => void;
  inputError: string | null;
  setInputError: (value: string | null) => void;
  isSubmitting: boolean;
  inputRef: RefObject<TextInput | null>;
  recipientErrors: FieldErrors<ShareEmailFormValues>["recipients"];
  contactName: string;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  open: boolean;
  colors: ReturnType<typeof useMobileThemeColors>;
}) {
  const tMobileShareContactEmail = useMobileShareContactEmailTranslations();
  const recipients = useWatch({ control, name: "recipients" }) ?? [];

  const trimmedInput = emailInput.trim().toLowerCase();
  const hasDraft = trimmedInput.length > 0;
  const isDraftValid = hasDraft && isValidRecipientEmail(trimmedInput);
  const isDraftDuplicate = hasDraft && recipients.includes(trimmedInput);
  const atRecipientCap = recipients.length >= MAX_SHARE_RECIPIENTS;

  const canAdd = isDraftValid && !isDraftDuplicate && !atRecipientCap && !isSubmitting;
  const pendingRecipientCount = recipients.length + (isDraftValid && !isDraftDuplicate ? 1 : 0);
  const canSend =
    !isSubmitting &&
    pendingRecipientCount > 0 &&
    (!hasDraft || (isDraftValid && !isDraftDuplicate));

  function refocusEmailInput() {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function addRecipients(nextRecipients: string[]) {
    if (nextRecipients.length === 0) {
      return;
    }

    const mergedRecipients = [...recipients, ...nextRecipients];
    setValue("recipients", mergedRecipients, { shouldDirty: true, shouldValidate: true });
    setEmailInput("");
    setInputError(null);
    refocusEmailInput();
  }

  function handleAddEmail() {
    if (!canAdd) {
      return;
    }
    addRecipients([trimmedInput]);
  }

  function handleRemoveRecipient(email: string) {
    setValue(
      "recipients",
      recipients.filter((recipient) => recipient !== email),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function handleEmailInputChange(text: string) {
    const result = processRecipientInputChange(text, recipients, MAX_SHARE_RECIPIENTS);

    if (result.type === "single") {
      setEmailInput(result.value);
      if (inputError) {
        setInputError(null);
      }
      return;
    }

    if (result.added.length > 0) {
      setValue("recipients", [...recipients, ...result.added], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    setEmailInput(result.remainder);

    if (result.hasInvalid && result.remainder) {
      setInputError(tMobileShareContactEmail("InvalidEmail"));
      return;
    }

    if (inputError) {
      setInputError(null);
    }
  }

  function handleEmailBlur() {
    setEmailInput((current) => current.trim());
  }

  function handleSubmitEditing() {
    if (canAdd) {
      handleAddEmail();
    }
  }

  const sendButtonLabel = formatShareEmailSendButtonLabel(
    pendingRecipientCount,
    tMobileShareContactEmail,
  );

  const addButton = (
    <Pressable
      disabled={!canAdd}
      hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
      onPress={handleAddEmail}
      style={styles.addButton}
    >
      <IconPlus size={16} stroke={canAdd ? colors.primary : colors.textMuted} />
      <Text style={[styles.addButtonText, { color: canAdd ? colors.primary : colors.textMuted }]}>
        {tMobileShareContactEmail("AddButton")}
      </Text>
    </Pressable>
  );

  return (
    <ActionSheetPopup
      actions={[
        {
          disabled: !canSend,
          icon: <IconSend color={colors.textOnPrimary} size={16} />,
          label: sendButtonLabel,
          loading: isSubmitting,
          onPress: () => {
            if (!canSend) {
              return;
            }
            void handleSend(recipients);
          },
          tone: "primary",
          variant: "filled",
        },
      ]}
      isBusy={isSubmitting}
      onClose={onClose}
      onOpenChange={onOpenChange}
      open={open}
      title={tMobileShareContactEmail("Title").replace("{name}", contactName)}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {tMobileShareContactEmail("Description")}
        </Text>
        <Text style={[styles.whatsIncluded, { color: colors.textMuted }]}>
          {tMobileShareContactEmail("WhatsIncluded")}
        </Text>

        <View style={styles.section}>
          <Text style={[MOBILE_TEXT_STYLES.fieldLabel, { color: colors.textMuted }]}>
            {tMobileShareContactEmail("RecipientsLabel")}
          </Text>

          <MobileTextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting && !atRecipientCap}
            enterKeyHint="next"
            error={Boolean(inputError)}
            errorMessage={inputError ?? recipientErrors?.message}
            keyboardType="email-address"
            onBlur={handleEmailBlur}
            onChangeText={handleEmailInputChange}
            onSubmitEditing={handleSubmitEditing}
            placeholder={tMobileShareContactEmail("RecipientsPlaceholder")}
            ref={inputRef}
            returnKeyType="next"
            trailingAccessory={addButton}
            value={emailInput}
          />

          {inputError ? (
            <Text style={[styles.errorText, { color: colors.dangerText }]}>{inputError}</Text>
          ) : null}

          {atRecipientCap ? (
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              {tMobileShareContactEmail("MaxRecipientsHint")}
            </Text>
          ) : null}

          {recipients.length > 0 ? (
            <View style={styles.chipsRow}>
              {recipients.map((email) => (
                <View
                  key={email}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surfacePressed, borderColor: colors.border },
                  ]}
                >
                  <Text numberOfLines={1} style={[styles.chipText, { color: colors.textPrimary }]}>
                    {email}
                  </Text>
                  <Pressable
                    accessibilityLabel={tMobileShareContactEmail("RemoveRecipient").replace(
                      "{email}",
                      email,
                    )}
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    hitSlop={{ bottom: 6, left: 6, right: 6, top: 6 }}
                    onPress={() => handleRemoveRecipient(email)}
                  >
                    <IconX size={12} stroke={colors.iconSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <ShareMessageField
          colors={colors}
          control={control}
          isSubmitting={isSubmitting}
          setValue={setValue}
        />
      </ScrollView>
    </ActionSheetPopup>
  );
}

function ShareMessageField({
  control,
  setValue,
  isSubmitting,
  colors,
}: {
  control: Control<ShareEmailFormValues>;
  setValue: UseFormSetValue<ShareEmailFormValues>;
  isSubmitting: boolean;
  colors: ReturnType<typeof useMobileThemeColors>;
}) {
  const tMobileShareContactEmail = useMobileShareContactEmailTranslations();
  const message = useWatch({ control, name: "message" }) ?? "";

  return (
    <View style={styles.messageSection}>
      <MobileTextInput
        containerStyle={styles.messageContainer}
        editable={!isSubmitting}
        maxLength={MAX_SHARE_MESSAGE_LENGTH}
        multiline
        numberOfLines={3}
        onChangeText={(value) =>
          setValue("message", value, { shouldDirty: true, shouldValidate: true })
        }
        placeholder={tMobileShareContactEmail("MessagePlaceholder")}
        style={styles.messageInput}
        value={message}
      />
      {message.length > MESSAGE_LENGTH_COUNTER_THRESHOLD ? (
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          {message.length}/{MAX_SHARE_MESSAGE_LENGTH}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  addButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  chip: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    maxWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipText: {
    flexShrink: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
  description: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
  },
  errorText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
  hintText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
  messageContainer: {
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  messageInput: {
    height: 72,
    textAlignVertical: "top",
  },
  messageSection: {
    gap: 4,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  section: {
    gap: 8,
  },
  whatsIncluded: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    lineHeight: 18,
  },
});
