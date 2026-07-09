"use client";

import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { Flex, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContactInfoLabels } from "@/lib/contacts/contact-info-labels";
import { useContactInfoLabels } from "@/lib/i18n/useContactInfoLabels";
import { EMAIL_TYPE_OPTIONS, PHONE_TYPE_OPTIONS } from "@/lib/platform/config";
import { ContactEmailsSection } from "./ContactEmailsSection";
import { ContactPhonesSection } from "./ContactPhonesSection";

export type { ContactInfoLabels } from "@/lib/contacts/contact-info-labels";

interface ContactInfoSectionProps {
  emails: EmailEntry[];
  labels?: Partial<ContactInfoLabels>;
  mode?: "all" | "phones" | "emails";
  onEmailsChange: (emails: EmailEntry[]) => void;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onSave: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
  phones: PhoneEntry[];
  savingField: string | null;
  showTitle?: boolean;
}

export function ContactInfoSection({
  phones,
  emails,
  savingField,
  onPhonesChange,
  onEmailsChange,
  onSave,
  mode = "all",
  showTitle = true,
  labels,
}: ContactInfoSectionProps) {
  const defaultLabels = useContactInfoLabels();
  const text: ContactInfoLabels = {
    ...defaultLabels,
    ...labels,
  };

  const phoneTypeOptions = PHONE_TYPE_OPTIONS.map((option) => ({
    emoji: option.emoji,
    label: option.value === "home" ? text.typeHome : text.typeWork,
    value: option.value,
  }));

  const emailTypeOptions = EMAIL_TYPE_OPTIONS.map((option) => ({
    emoji: option.emoji,
    label: option.value === "home" ? text.typeHome : text.typeWork,
    value: option.value,
  }));

  const showSchemaNotification = (message?: string) => {
    notifications.show(
      errorNotificationTemplate({
        description: message || text.invalidEmailMessage,
        title: text.invalidEmailTitle,
      }),
    );
  };

  const showPhones = mode !== "emails";
  const showEmails = mode !== "phones";

  return (
    <div>
      {showTitle ? (
        <Text fw={600} mb="md" size="sm">
          {text.title}
        </Text>
      ) : null}
      <Flex direction={{ base: "column", md: "row" }} gap="xl">
        {showPhones ? (
          <ContactPhonesSection
            labels={text}
            onPhonesChange={onPhonesChange}
            onSave={onSave}
            phones={phones}
            phoneTypeOptions={phoneTypeOptions}
            savingField={savingField}
            showSchemaNotification={showSchemaNotification}
          />
        ) : null}

        {showEmails ? (
          <ContactEmailsSection
            emails={emails}
            emailTypeOptions={emailTypeOptions}
            labels={text}
            onEmailsChange={onEmailsChange}
            onSave={onSave}
            savingField={savingField}
            showSchemaNotification={showSchemaNotification}
          />
        ) : null}
      </Flex>
    </div>
  );
}
