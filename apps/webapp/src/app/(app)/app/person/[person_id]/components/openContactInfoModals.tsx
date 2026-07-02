"use client";

import { IconMail, IconPhone } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { ModalTitle } from "@bondery/mantine-next";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { createModalId, useModalBlocking } from "@/lib/modals";
import { ContactInfoSection, type ContactInfoLabels } from "./ContactInfoSection";

type ContactInfoModalBodyProps = {
  modalId: string;
  savingField: string | null;
  blockingField: "phones" | "emails";
  phones: PhoneEntry[];
  emails: EmailEntry[];
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
  labels: Partial<ContactInfoLabels>;
};

function ContactInfoModalBody({
  modalId,
  savingField,
  blockingField,
  phones,
  emails,
  onPhonesChange,
  onEmailsChange,
  onSaveContactInfo,
  labels,
}: ContactInfoModalBodyProps) {
  useModalBlocking(modalId, savingField === blockingField);

  return (
    <ContactInfoSection
      phones={phones}
      emails={emails}
      savingField={savingField}
      onPhonesChange={onPhonesChange}
      onEmailsChange={onEmailsChange}
      onSave={onSaveContactInfo}
      mode={blockingField}
      showTitle={false}
      labels={labels}
    />
  );
}

export interface OpenContactInfoModalParams {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  savingField: string | null;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
  labels: Partial<ContactInfoLabels>;
  phoneTitle: string;
  emailTitle: string;
}

export function openContactPhonesModal({
  phones,
  emails,
  savingField,
  onPhonesChange,
  onEmailsChange,
  onSaveContactInfo,
  labels,
  phoneTitle,
}: OpenContactInfoModalParams) {
  const modalId = createModalId("contact-phones");

  modals.open({
    modalId,
    title: <ModalTitle text={phoneTitle} icon={<IconPhone size={20} />} />,
    size: "lg",
    children: (
      <ContactInfoModalBody
        modalId={modalId}
        blockingField="phones"
        phones={phones}
        emails={emails}
        savingField={savingField}
        onPhonesChange={onPhonesChange}
        onEmailsChange={onEmailsChange}
        onSaveContactInfo={onSaveContactInfo}
        labels={labels}
      />
    ),
  });
}

export function openContactEmailsModal({
  phones,
  emails,
  savingField,
  onPhonesChange,
  onEmailsChange,
  onSaveContactInfo,
  labels,
  emailTitle,
}: OpenContactInfoModalParams) {
  const modalId = createModalId("contact-emails");

  modals.open({
    modalId,
    title: <ModalTitle text={emailTitle} icon={<IconMail size={20} />} />,
    size: "lg",
    children: (
      <ContactInfoModalBody
        modalId={modalId}
        blockingField="emails"
        phones={phones}
        emails={emails}
        savingField={savingField}
        onPhonesChange={onPhonesChange}
        onEmailsChange={onEmailsChange}
        onSaveContactInfo={onSaveContactInfo}
        labels={labels}
      />
    ),
  });
}
