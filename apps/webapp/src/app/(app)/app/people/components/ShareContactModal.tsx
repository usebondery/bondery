"use client";

import { useState } from "react";
import { Checkbox, SimpleGrid, Stack, TagsInput, Text, Textarea, Tooltip } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconSend2, IconShare } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { SelectableCard } from "@/app/(app)/app/components/SelectableCard";
import {
  ModalFooter,
  ModalTitle,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { useShareContactMutation } from "@/lib/query/hooks/useContacts";
import {
  shareContactEmailSchema,
  type Contact,
  type ContactAddressEntry,
  type EmailEntry,
  type ImportantDate,
  type PhoneEntry,
  type ShareableField,
} from "@bondery/schemas";
import { z } from "zod";
import { createModalId, useModalBlocking } from "@/lib/modals";

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
  recipientEmails: shareContactEmailSchema.shape.recipients,
  message: shareContactEmailSchema.shape.message,
});

interface OpenShareContactModalParams {
  contact: Contact;
}

function ShareContactModalTitle() {
  const tShare = useTranslations("ShareContactModal");

  return <ModalTitle text={tShare("ModalTitle")} icon={<IconShare size={22} />} />;
}

export function openShareContactModal({ contact }: OpenShareContactModalParams) {
  const modalId = createModalId("share-contact");

  modals.open({
    modalId,
    trapFocus: true,
    size: "lg",
    title: <ShareContactModalTitle />,
    children: <ShareContactModalContent contact={contact} modalId={modalId} />,
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
  modalTitle: string;
  recipientEmailLabel: string;
  recipientEmailPlaceholder: string;
  recipientsLabel: string;
  recipientsPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  sendCopyCheckbox: string;
  sendCopyTooltip: string;
  selectFieldsLabel: string;
  submitButton: (count: number) => string;
  cancelButton: string;
  sendingButton: string;
  successTitle: string;
  successDescription: string;
  errorTitle: string;
  errorDescription: string;
  noFieldsSelectedError: string;
  noRecipientsError: string;
  invalidEmailError: string;
  invalidEmailsError: string;
  maxRecipientsError: string;
  requiredFieldTooltip: string;
  avatarRequiredTooltip: string;
  avatarDescription: (name: string) => string;
  fieldLabels: Record<ShareableField, string>;
}

interface OpenShareContactModalParams {
  contact: Contact;
}

function ShareContactModalContent({ contact, modalId }: { contact: Contact; modalId: string }) {
  const tShare = useTranslations("ShareContactModal");
  const shareContactMutation = useShareContactMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  useModalBlocking(modalId, isSubmitting);
  const form = useForm({
    mode: "controlled",
    initialValues: {
      recipientEmails: [] as string[],
      message: "",
    },
    validate: schemaResolver(shareContactFormSchema, { sync: true }),
  });

  const availableFields = ALL_FIELDS.filter(
    (field) => REQUIRED_FIELDS.includes(field) || hasFieldData(contact, field),
  );

  const [selectedFields, setSelectedFields] = useState<Set<ShareableField>>(() => {
    const initial = new Set<ShareableField>(REQUIRED_FIELDS);
    if (availableFields.includes("linkedin")) initial.add("linkedin");
    if (availableFields.includes("location")) initial.add("location");
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
        personId: contact.id,
        recipientEmails: values.recipientEmails,
        message: values.message || undefined,
        selectedFields: Array.from(new Set([...selectedFields, ...REQUIRED_FIELDS])),
      });

      notifications.show(
        successNotificationTemplate({
          title: tShare("SuccessTitle"),
          description: tShare("SuccessDescription"),
        }),
      );
      modals.close(modalId);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: tShare("ErrorTitle"),
          description: tShare("ErrorDescription"),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TagsInput
          label={tShare("RecipientsLabel")}
          placeholder={form.values.recipientEmails.length > 0 ? "" : tShare("RecipientsPlaceholder")}
          value={form.values.recipientEmails}
          onChange={(values) => form.setFieldValue("recipientEmails", values)}
          error={form.errors.recipientEmails}
          required
          data-autofocus
          splitChars={[",", " "]}
          clearable
        />

        <Textarea
          label={tShare("MessageLabel")}
          placeholder={tShare("MessagePlaceholder")}
          value={form.values.message}
          onChange={(e) => form.setFieldValue("message", e.currentTarget.value)}
          rows={3}
        />

        <Tooltip label={tShare("SendCopyTooltip")} withArrow>
          <Checkbox label={tShare("SendCopyCheckbox")} checked disabled onChange={() => {}} />
        </Tooltip>

        <Text fw={500} size="sm">
          {tShare("SelectFieldsLabel")}
        </Text>

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
          {availableFields.map((field) => {
            const isRequiredField = REQUIRED_FIELDS.includes(field);

            return (
              <Tooltip
                key={field}
                label={
                  field === "avatar"
                    ? tShare("AvatarRequiredTooltip")
                    : tShare("RequiredFieldTooltip")
                }
                disabled={!isRequiredField}
                withArrow
              >
                <div>
                  <SelectableCard
                    label={tShare(`Fields.${field}`)}
                    description={
                      field === "avatar"
                        ? tShare("AvatarDescription", { name: contactName })
                        : getFieldPreview(contact, field) || undefined
                    }
                    selected={selectedFields.has(field)}
                    disabled={isRequiredField}
                    onClick={() => toggleField(field)}
                  />
                </div>
              </Tooltip>
            );
          })}
        </SimpleGrid>

        <ModalFooter
          cancelLabel={tShare("CancelButton")}
          onCancel={() => modals.close(modalId)}
          cancelDisabled={isSubmitting}
          actionLabel={
            isSubmitting
              ? tShare("SendingButton")
              : form.values.recipientEmails.length > 0
                ? tShare("SubmitButtonWithCount", { count: form.values.recipientEmails.length })
                : tShare("SubmitButton")
          }
          actionType="submit"
          actionLoading={isSubmitting}
          actionDisabled={isSubmitting}
          actionLeftSection={<IconSend2 size={16} />}
        />
      </Stack>
    </form>
  );
}
