"use client";

import { buildShareableFieldPreviews } from "@bondery/helpers/contact";
import {
  errorNotificationTemplate,
  ModalFooter,
  ModalScrollLayout,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  type Contact,
  emailAddressSchema,
  type ShareableField,
  shareContactEmailSchema,
} from "@bondery/schemas";
import { Checkbox, SimpleGrid, Stack, TagsInput, Text, Textarea, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconSend2, IconShare } from "@tabler/icons-react";
import { useState } from "react";
import { z } from "zod";
import { SelectableCard } from "@/components/shell/SelectableCard";
import { useShareContactModalTranslations } from "@/lib/i18n/generated/hooks";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { useShareContactMutation } from "@/lib/query/hooks/useContacts";

const REQUIRED_FIELDS: ShareableField[] = ["avatar", "headline"];
const shareContactFormSchema = z.object({
  message: shareContactEmailSchema.shape.message,
  recipientEmails: shareContactEmailSchema.shape.recipients,
});

function recipientEmailsFieldError(
  value: string[],
  messages: {
    invalidEmail: string;
    invalidEmails: string;
    maxRecipients: string;
    noRecipients: string;
  },
): string | null {
  const parsed = shareContactEmailSchema.shape.recipients.safeParse(value);
  if (parsed.success) {
    return null;
  }
  if (value.length === 0) {
    return messages.noRecipients;
  }

  const hasInvalid = value.some((email) => !emailAddressSchema.safeParse(email).success);
  if (hasInvalid) {
    return value.length === 1 ? messages.invalidEmail : messages.invalidEmails;
  }

  const unique = new Set(value.map((email) => email.trim().toLowerCase()));
  if (unique.size !== value.length) {
    return messages.invalidEmails;
  }

  return messages.maxRecipients;
}

interface OpenShareContactModalParams {
  contact: Contact;
}

function ShareContactModalTitle() {
  const tShare = useShareContactModalTranslations();

  return <ModalTitle icon={<IconShare size={22} />} text={tShare("ModalTitle")} />;
}

export function openShareContactModal({ contact }: OpenShareContactModalParams) {
  const modalId = createModalId("share-contact");

  modals.open({
    children: <ShareContactModalContent contact={contact} modalId={modalId} />,
    modalId,
    size: "lg",
    title: <ShareContactModalTitle />,
    trapFocus: true,
  });
}

function contactShareFieldPreviews(contact: Contact) {
  return buildShareableFieldPreviews({
    addresses: contact.addresses,
    avatar: contact.avatar,
    emails: contact.emails,
    facebook: contact.facebook,
    firstName: contact.firstName,
    headline: contact.headline,
    importantDates: contact.importantDates,
    instagram: contact.instagram,
    lastName: contact.lastName,
    linkedin: contact.linkedin,
    location: contact.location,
    notes: contact.notes,
    phones: contact.phones,
    signal: contact.signal,
    website: contact.website,
    whatsapp: contact.whatsapp,
  });
}

export interface ShareContactTexts {
  avatarDescription: (name: string) => string;
  avatarRequiredTooltip: string;
  cancelButton: string;
  errorDescription: string;
  errorTitle: string;
  fieldLabels: Record<ShareableField, string>;
  invalidEmailError: string;
  invalidEmailsError: string;
  maxRecipientsError: string;
  messageLabel: string;
  messagePlaceholder: string;
  modalTitle: string;
  noFieldsSelectedError: string;
  noRecipientsError: string;
  recipientEmailLabel: string;
  recipientEmailPlaceholder: string;
  recipientsLabel: string;
  recipientsPlaceholder: string;
  requiredFieldTooltip: string;
  selectFieldsLabel: string;
  sendCopyCheckbox: string;
  sendCopyTooltip: string;
  sendingButton: string;
  submitButton: (count: number) => string;
  successDescription: string;
  successTitle: string;
}

function ShareContactModalContent({ contact, modalId }: { contact: Contact; modalId: string }) {
  const tShare = useShareContactModalTranslations();
  const shareContactMutation = useShareContactMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBlocking = isSubmitting;
  const { closeModal } = useModalDismiss(modalId, isBlocking);
  const form = useForm({
    initialValues: {
      message: "",
      recipientEmails: [] as string[],
    },
    mode: "controlled",
    validate: {
      message: (value) => {
        const parsed = shareContactEmailSchema.shape.message.safeParse(value);
        return parsed.success ? null : (parsed.error.issues[0]?.message ?? true);
      },
      recipientEmails: (value) =>
        recipientEmailsFieldError(value, {
          invalidEmail: tShare("InvalidEmailError"),
          invalidEmails: tShare("InvalidEmailsError"),
          maxRecipients: tShare("MaxRecipientsError"),
          noRecipients: tShare("NoRecipientsError"),
        }),
    },
    validateInputOnBlur: true,
    validateInputOnChange: ["recipientEmails"],
  });
  const canSubmit = shareContactFormSchema.safeParse(form.values).success;

  const fieldPreviews = contactShareFieldPreviews(contact);
  const availableFields = fieldPreviews.map((entry) => entry.field);
  const previewByField = new Map(fieldPreviews.map((entry) => [entry.field, entry.preview]));

  const [selectedFields, setSelectedFields] = useState<Set<ShareableField>>(() => {
    const initial = new Set<ShareableField>(
      REQUIRED_FIELDS.filter((field) => availableFields.includes(field)),
    );
    if (availableFields.includes("linkedin")) {
      initial.add("linkedin");
    }
    if (availableFields.includes("location")) {
      initial.add("location");
    }
    if (availableFields.includes("emails")) {
      initial.add("emails");
    }
    return initial;
  });

  const toggleField = (field: ShareableField) => {
    if (REQUIRED_FIELDS.includes(field)) {
      return;
    }

    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const handleSubmit = async (values: typeof form.values) => {
    const parsed = shareContactFormSchema.safeParse(values);
    if (!parsed.success) {
      form.validate();
      return;
    }

    setIsSubmitting(true);

    try {
      await shareContactMutation.mutateAsync({
        message: parsed.data.message,
        personId: contact.id,
        recipientEmails: parsed.data.recipientEmails,
        selectedFields: Array.from(
          new Set([
            ...selectedFields,
            ...REQUIRED_FIELDS.filter((field) => availableFields.includes(field)),
          ]),
        ),
        sendCopy: true,
      });

      notifications.show(
        successNotificationTemplate({
          description: tShare("SuccessDescription"),
          title: tShare("SuccessTitle"),
        }),
      );
      closeModal();
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: tShare("ErrorDescription"),
          title: tShare("ErrorTitle"),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <ModalScrollLayout
      footer={
        <ModalFooter
          actionDisabled={isSubmitting || !canSubmit}
          actionLabel={
            isSubmitting
              ? tShare("SendingButton")
              : form.values.recipientEmails.length > 0
                ? tShare("SubmitButtonWithCount", { count: form.values.recipientEmails.length })
                : tShare("SubmitButton")
          }
          actionLeftSection={<IconSend2 size={16} />}
          actionLoading={isSubmitting}
          cancelDisabled={isSubmitting}
          cancelLabel={tShare("CancelButton")}
          mt={0}
          onAction={() => form.onSubmit(handleSubmit)()}
          onCancel={closeModal}
        />
      }
    >
      <Stack gap="md">
        <TagsInput
          {...form.getInputProps("recipientEmails")}
          clearable
          data-autofocus
          disabled={isBlocking}
          label={tShare("RecipientsLabel")}
          placeholder={
            form.values.recipientEmails.length > 0 ? "" : tShare("RecipientsPlaceholder")
          }
          required
          splitChars={[",", " "]}
        />

        <Textarea
          {...form.getInputProps("message")}
          disabled={isBlocking}
          label={tShare("MessageLabel")}
          placeholder={tShare("MessagePlaceholder")}
          rows={3}
        />

        <Tooltip label={tShare("SendCopyTooltip")}>
          <Checkbox checked disabled label={tShare("SendCopyCheckbox")} onChange={() => {}} />
        </Tooltip>

        <Text fw={500} size="sm">
          {tShare("SelectFieldsLabel")}
        </Text>

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
          {availableFields.map((field) => {
            const isRequiredField = REQUIRED_FIELDS.includes(field);

            return (
              <Tooltip
                disabled={!isRequiredField}
                key={field}
                label={
                  field === "avatar"
                    ? tShare("AvatarRequiredTooltip")
                    : tShare("RequiredFieldTooltip")
                }
              >
                <div>
                  <SelectableCard
                    description={
                      field === "avatar"
                        ? tShare("AvatarDescription", { name: contactName })
                        : previewByField.get(field)
                    }
                    disabled={isRequiredField || isBlocking}
                    label={tShare(`Fields.${field}`)}
                    onClick={() => toggleField(field)}
                    selected={selectedFields.has(field)}
                  />
                </div>
              </Tooltip>
            );
          })}
        </SimpleGrid>
      </Stack>
    </ModalScrollLayout>
  );
}
