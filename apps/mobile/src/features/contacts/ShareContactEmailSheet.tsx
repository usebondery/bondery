import { useEffect, useRef, useState, type RefObject } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { IconPlus, IconSend, IconX } from "@tabler/icons-react-native";
import { shareContactEmailSchema } from "@bondery/schemas";
import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
} from "react-hook-form";
import { ActionSheetPopup } from "../../components/ActionSheetPopup";
import { MobileTextInput } from "../../components/MobileTextInput";
import { shareContactEmail } from "../../lib/api/client";
import { UI_TIMING_MS } from "../../lib/config";
import { useSheetForm } from "../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TEXT_STYLES, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import {
  MAX_SHARE_MESSAGE_LENGTH,
  MAX_SHARE_RECIPIENTS,
  MESSAGE_LENGTH_COUNTER_THRESHOLD,
  buildFinalRecipients,
  formatShareEmailSendButtonLabel,
  isValidRecipientEmail,
  processRecipientInputChange,
} from "./shareContactEmailUtils";

interface ShareContactEmailSheetProps {
  open: boolean;
  contactId: string;
  contactName: string;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
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
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const inputRef = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useSheetForm({
    open,
    schema: shareContactEmailSchema,
    getDefaultValues: () => ({
      recipients: [],
      message: "",
    }),
    mode: "onChange",
  });

  const [emailInput, setEmailInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmailInput("");
    setInputError(null);
    setIsSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);
    return () => clearTimeout(timer);
  }, [open]);

  const sendWithValidation = handleSubmit(async ({ recipients: finalRecipients, message: formMessage }) => {
    setIsSubmitting(true);

    try {
      await shareContactEmail({
        personId: contactId,
        recipientEmails: finalRecipients,
        message: formMessage,
      });

      showToast({
        type: "success",
        headline: t("MobileApp.ShareContactEmail.SuccessHeadline"),
        description: t("MobileApp.ShareContactEmail.SuccessDescription"),
      });
      onClose();
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.ShareContactEmail.ErrorHeadline"),
        description: t("MobileApp.ShareContactEmail.ErrorDescription"),
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  async function handleSend(recipients: string[]) {
    const finalRecipients = buildFinalRecipients(recipients, emailInput);
    setValue("recipients", finalRecipients, { shouldDirty: true, shouldValidate: true });
    await sendWithValidation();
  }

  return (
    <ShareContactEmailSheetContent
      control={control}
      setValue={setValue}
      handleSend={handleSend}
      emailInput={emailInput}
      setEmailInput={setEmailInput}
      inputError={inputError}
      setInputError={setInputError}
      isSubmitting={isSubmitting}
      inputRef={inputRef}
      recipientErrors={errors.recipients}
      contactName={contactName}
      onOpenChange={onOpenChange}
      onClose={onClose}
      open={open}
      t={t}
      colors={colors}
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
  t,
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
  t: ReturnType<typeof useMobileTranslations>;
  colors: ReturnType<typeof useMobileThemeColors>;
}) {
  const recipients = useWatch({ control, name: "recipients" }) ?? [];

  const trimmedInput = emailInput.trim().toLowerCase();
  const hasDraft = trimmedInput.length > 0;
  const isDraftValid = hasDraft && isValidRecipientEmail(trimmedInput);
  const isDraftDuplicate = hasDraft && recipients.includes(trimmedInput);
  const atRecipientCap = recipients.length >= MAX_SHARE_RECIPIENTS;

  const canAdd = isDraftValid && !isDraftDuplicate && !atRecipientCap && !isSubmitting;
  const pendingRecipientCount =
    recipients.length + (isDraftValid && !isDraftDuplicate ? 1 : 0);
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
    if (nextRecipients.length === 0) return;

    const mergedRecipients = [...recipients, ...nextRecipients];
    setValue("recipients", mergedRecipients, { shouldDirty: true, shouldValidate: true });
    setEmailInput("");
    setInputError(null);
    refocusEmailInput();
  }

  function handleAddEmail() {
    if (!canAdd) return;
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
      if (inputError) setInputError(null);
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
      setInputError(t("MobileApp.ShareContactEmail.InvalidEmail"));
      return;
    }

    if (inputError) setInputError(null);
  }

  function handleEmailBlur() {
    setEmailInput((current) => current.trim());
  }

  function handleSubmitEditing() {
    if (canAdd) {
      handleAddEmail();
    }
  }

  const sendButtonLabel = formatShareEmailSendButtonLabel(pendingRecipientCount, t);

  const addButton = (
    <Pressable
      onPress={handleAddEmail}
      disabled={!canAdd}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.addButton}
    >
      <IconPlus size={16} stroke={canAdd ? colors.primary : colors.textMuted} />
      <Text
        style={[
          styles.addButtonText,
          { color: canAdd ? colors.primary : colors.textMuted },
        ]}
      >
        {t("MobileApp.ShareContactEmail.AddButton")}
      </Text>
    </Pressable>
  );

  return (
    <ActionSheetPopup
      open={open}
      title={t("MobileApp.ShareContactEmail.Title").replace("{name}", contactName)}
      actions={[
        {
          label: sendButtonLabel,
          icon: <IconSend size={16} color={colors.textOnPrimary} />,
          onPress: () => {
            if (!canSend) return;
            void handleSend(recipients);
          },
          loading: isSubmitting,
          disabled: !canSend,
          tone: "primary",
          variant: "filled",
        },
      ]}
      onOpenChange={onOpenChange}
      onClose={onClose}
      isBusy={isSubmitting}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t("MobileApp.ShareContactEmail.Description")}
        </Text>
        <Text style={[styles.whatsIncluded, { color: colors.textMuted }]}>
          {t("MobileApp.ShareContactEmail.WhatsIncluded")}
        </Text>

        <View style={styles.section}>
          <Text style={[MOBILE_TEXT_STYLES.fieldLabel, { color: colors.textMuted }]}>
            {t("MobileApp.ShareContactEmail.RecipientsLabel")}
          </Text>

          <MobileTextInput
            ref={inputRef}
            value={emailInput}
            onChangeText={handleEmailInputChange}
            onBlur={handleEmailBlur}
            placeholder={t("MobileApp.ShareContactEmail.RecipientsPlaceholder")}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isSubmitting && !atRecipientCap}
            error={Boolean(inputError)}
            errorMessage={inputError ?? recipientErrors?.message}
            returnKeyType="next"
            enterKeyHint="next"
            onSubmitEditing={handleSubmitEditing}
            trailingAccessory={addButton}
          />

          {inputError ? (
            <Text style={[styles.errorText, { color: colors.dangerText }]}>{inputError}</Text>
          ) : null}

          {atRecipientCap ? (
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              {t("MobileApp.ShareContactEmail.MaxRecipientsHint")}
            </Text>
          ) : null}

          {recipients.length > 0 ? (
            <View style={styles.chipsRow}>
              {recipients.map((email) => (
                <View
                  key={email}
                  style={[styles.chip, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
                >
                  <Text
                    style={[styles.chipText, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {email}
                  </Text>
                  <Pressable
                    onPress={() => handleRemoveRecipient(email)}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={t("MobileApp.ShareContactEmail.RemoveRecipient").replace(
                      "{email}",
                      email,
                    )}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <IconX size={12} stroke={colors.iconSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <ShareMessageField control={control} setValue={setValue} isSubmitting={isSubmitting} t={t} colors={colors} />
      </ScrollView>
    </ActionSheetPopup>
  );
}

function ShareMessageField({
  control,
  setValue,
  isSubmitting,
  t,
  colors,
}: {
  control: Control<ShareEmailFormValues>;
  setValue: UseFormSetValue<ShareEmailFormValues>;
  isSubmitting: boolean;
  t: ReturnType<typeof useMobileTranslations>;
  colors: ReturnType<typeof useMobileThemeColors>;
}) {
  const message = useWatch({ control, name: "message" }) ?? "";

  return (
    <View style={styles.messageSection}>
      <MobileTextInput
        value={message}
        onChangeText={(value) =>
          setValue("message", value, { shouldDirty: true, shouldValidate: true })
        }
        placeholder={t("MobileApp.ShareContactEmail.MessagePlaceholder")}
        multiline
        numberOfLines={3}
        maxLength={MAX_SHARE_MESSAGE_LENGTH}
        editable={!isSubmitting}
        style={styles.messageInput}
        containerStyle={styles.messageContainer}
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
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  description: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 20,
  },
  whatsIncluded: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    lineHeight: 18,
  },
  section: {
    gap: 8,
  },
  messageSection: {
    gap: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  errorText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
  hintText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    maxWidth: 220,
  },
  chipText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    flexShrink: 1,
  },
  messageContainer: {
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  messageInput: {
    height: 72,
    textAlignVertical: "top",
  },
});
