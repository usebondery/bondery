"use client";

import {
  errorNotificationTemplate,
  ModalFooter,
  ModalScrollLayout,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  type Contact,
  type ContactAddressEntry,
  type EmailEntry,
  type ImportantDate,
  type PhoneEntry,
  type ShareableField,
  shareContactEmailSchema,
} from "@bondery/schemas";
import { Checkbox, SimpleGrid, Stack, TagsInput, Text, Textarea, Tooltip } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconSend2, IconShare } from "@tabler/icons-react";
import { useState } from "react";
import { z } from "zod";
import { SelectableCard } from "@/app/(app)/app/components/SelectableCard";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { useShareContactMutation } from "@/lib/query/hooks/useContacts";

const ALL_FIELDS: ShareableField[] = [
  "avatar",
  "headline",
  "phones",
  "emails",
  "location",
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
  "addresses",
  "notes",
  "importantDates",
];

const REQUIRED_FIELDS: ShareableField[] = ["avatar", "headline"];
const shareContactFormSchema = z.object({
  message: shareContactEmailSchema.shape.message,
  recipientEmails: shareContactEmailSchema.shape.recipients,
});

interface OpenShareContactModalParams {
  contact: Contact;
}

function ShareContactModalTitle() {
  const tShare = useWebTranslations("ShareContactModal");

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

function hasFieldData(contact: Contact, field: ShareableField): boolean {
  switch (field) {
    case "name":
      return Boolean(contact.firstName || contact.lastName);
    case "avatar":
      return true;
    case "headline":
      return Boolean(contact.headline);
    case "phones":
      return Array.isArray(contact.phones) && contact.phones.length > 0;
    case "emails":
      return Array.isArray(contact.emails) && contact.emails.length > 0;
    case "location":
      return Boolean(contact.location);
    case "linkedin":
      return Boolean(contact.linkedin);
    case "instagram":
      return Boolean(contact.instagram);
    case "facebook":
      return Boolean(contact.facebook);
    case "website":
      return Boolean(contact.website);
    case "whatsapp":
      return Boolean(contact.whatsapp);
    case "signal":
      return Boolean(contact.signal);
    case "addresses":
      return Array.isArray(contact.addresses) && contact.addresses.length > 0;
    case "notes":
      return Boolean(contact.notes);
    case "importantDates":
      return Array.isArray(contact.importantDates) && contact.importantDates.length > 0;
    default:
      return false;
  }
}

function getFieldPreview(contact: Contact, field: ShareableField): string {
  switch (field) {
    case "avatar":
      return "";
    case "phones": {
      const first = (contact.phones as PhoneEntry[])?.[0];
      return first ? `${first.prefix || ""}${first.value}`.trim() : "";
    }
    case "emails": {
      const first = (contact.emails as EmailEntry[])?.[0];
      return first?.value ?? "";
    }
    case "headline":
      return contact.headline
        ? contact.headline.length > 60
          ? `${contact.headline.slice(0, 60)}…`
          : contact.headline
        : "";
    case "location":
      return contact.location ?? "";
    case "notes":
      return contact.notes
        ? contact.notes.length > 60
          ? `${contact.notes.slice(0, 60)}…`
          : contact.notes
        : "";
    case "linkedin":
      return contact.linkedin ? `@${contact.linkedin}` : "";
    case "instagram":
      return contact.instagram ? `@${contact.instagram}` : "";
    case "facebook":
      return contact.facebook ?? "";
    case "website":
      return contact.website ?? "";
    case "whatsapp":
      return contact.whatsapp ?? "";
    case "signal":
      return contact.signal ?? "";
    case "addresses": {
      const first = (contact.addresses as ContactAddressEntry[])?.[0];
      return first?.addressFormatted ?? "";
    }
    case "importantDates": {
      const first = (contact.importantDates as ImportantDate[])?.[0];
      return first ? `${first.type}: ${first.date}` : "";
    }
    default:
      return "";
  }
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

interface OpenShareContactModalParams {
  contact: Contact;
}

function ShareContactModalContent({ contact, modalId }: { contact: Contact; modalId: string }) {
  const tShare = useWebTranslations("ShareContactModal");
  const shareContactMutation = useShareContactMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { closeModal } = useModalDismiss(modalId, isSubmitting);
  const form = useForm({
    initialValues: {
      message: "",
      recipientEmails: [] as string[],
    },
    mode: "controlled",
    validate: schemaResolver(shareContactFormSchema, { sync: true }),
  });

  const availableFields = ALL_FIELDS.filter(
    (field) => REQUIRED_FIELDS.includes(field) || hasFieldData(contact, field),
  );

  const [selectedFields, setSelectedFields] = useState<Set<ShareableField>>(() => {
    const initial = new Set<ShareableField>(REQUIRED_FIELDS);
    if (availableFields.includes("linkedin")) {
      initial.add("linkedin");
    }
    if (availableFields.includes("location")) {
      initial.add("location");
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
    setIsSubmitting(true);

    try {
      await shareContactMutation.mutateAsync({
        message: values.message || undefined,
        personId: contact.id,
        recipientEmails: values.recipientEmails,
        selectedFields: Array.from(new Set([...selectedFields, ...REQUIRED_FIELDS])),
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
          actionDisabled={isSubmitting}
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
          clearable
          data-autofocus
          error={form.errors.recipientEmails}
          label={tShare("RecipientsLabel")}
          onChange={(values) => form.setFieldValue("recipientEmails", values)}
          placeholder={
            form.values.recipientEmails.length > 0 ? "" : tShare("RecipientsPlaceholder")
          }
          required
          splitChars={[",", " "]}
          value={form.values.recipientEmails}
        />

        <Textarea
          label={tShare("MessageLabel")}
          onChange={(e) => form.setFieldValue("message", e.currentTarget.value)}
          placeholder={tShare("MessagePlaceholder")}
          rows={3}
          value={form.values.message}
        />

        <Tooltip label={tShare("SendCopyTooltip")} withArrow>
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
                withArrow
              >
                <div>
                  <SelectableCard
                    description={
                      field === "avatar"
                        ? tShare("AvatarDescription", { name: contactName })
                        : getFieldPreview(contact, field) || undefined
                    }
                    disabled={isRequiredField}
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
