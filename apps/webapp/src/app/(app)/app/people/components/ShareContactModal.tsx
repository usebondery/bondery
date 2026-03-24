"use client";

import { useState } from "react";
import {
  Checkbox,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconSend2, IconShare } from "@tabler/icons-react";
import { SelectableCard } from "@/app/(app)/app/components/SelectableCard";
import {
  ModalFooter,
  ModalTitle,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  ImportantDate,
  PhoneEntry,
  ShareableField,
} from "@bondery/types";

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

export interface ShareContactTexts {
  modalTitle: string;
  recipientEmailLabel: string;
  recipientEmailPlaceholder: string;
  recipientsLabel: string;
  recipientsPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  sendCopyCheckbox: string;
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
  texts: ShareContactTexts;
}

export function openShareContactModal({ contact, texts }: OpenShareContactModalParams) {
  const modalId = `share-contact-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    trapFocus: true,
    size: "lg",
    title: <ModalTitle text={texts.modalTitle} icon={<IconShare size={22} />} />,
    children: <ShareContactModalContent contact={contact} texts={texts} modalId={modalId} />,
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 10;

function ShareContactModalContent({
  contact,
  texts,
  modalId,
}: {
  contact: Contact;
  texts: ShareContactTexts;
  modalId: string;
}) {
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sendCopy, setSendCopy] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

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

  const validate = (): boolean => {
    if (recipientEmails.length === 0) {
      setEmailError(texts.noRecipientsError);
      return false;
    }
    if (recipientEmails.length > MAX_RECIPIENTS) {
      setEmailError(texts.maxRecipientsError);
      return false;
    }
    const allValid = recipientEmails.every((e) => EMAIL_REGEX.test(e));
    if (!allValid) {
      setEmailError(texts.invalidEmailsError);
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(API_ROUTES.CONTACTS_SHARE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: contact.id,
          recipientEmails,
          message: message || undefined,
          sendCopy,
          selectedFields: Array.from(new Set([...selectedFields, ...REQUIRED_FIELDS])),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to share contact");
      }

      notifications.show(
        successNotificationTemplate({
          title: texts.successTitle,
          description: texts.successDescription,
        }),
      );
      modals.close(modalId);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: texts.errorTitle,
          description: texts.errorDescription,
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <Stack gap="md">
      <TagsInput
        label={texts.recipientsLabel}
        placeholder={recipientEmails.length > 0 ? "" : texts.recipientsPlaceholder}
        value={recipientEmails}
        onChange={(values) => {
          setRecipientEmails(values);
          setEmailError(null);
        }}
        error={emailError}
        required
        data-autofocus
        splitChars={[",", " "]}
        clearable
      />

      <Textarea
        label={texts.messageLabel}
        placeholder={texts.messagePlaceholder}
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        rows={3}
      />

      <Checkbox
        label={texts.sendCopyCheckbox}
        checked={sendCopy}
        onChange={(e) => setSendCopy(e.currentTarget.checked)}
      />

      <Text fw={500} size="sm">
        {texts.selectFieldsLabel}
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
        {availableFields.map((field) => {
          const isRequiredField = REQUIRED_FIELDS.includes(field);

          return (
            <Tooltip
              key={field}
              label={field === "avatar" ? texts.avatarRequiredTooltip : texts.requiredFieldTooltip}
              disabled={!isRequiredField}
              withArrow
            >
              <div>
                <SelectableCard
                  label={texts.fieldLabels[field]}
                  description={field === "avatar" ? texts.avatarDescription(contactName) : getFieldPreview(contact, field) || undefined}
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
        cancelLabel={texts.cancelButton}
        onCancel={() => modals.close(modalId)}
        cancelDisabled={isSubmitting}
        actionLabel={isSubmitting ? texts.sendingButton : texts.submitButton(recipientEmails.length)}
        onAction={handleSubmit}
        actionLoading={isSubmitting}
        actionDisabled={isSubmitting}
        actionLeftSection={<IconSend2 size={16} />}
      />
    </Stack>
  );
}
