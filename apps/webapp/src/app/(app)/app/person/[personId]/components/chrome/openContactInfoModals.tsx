"use client";

import { ModalTitle } from "@bondery/mantine-next";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { modals } from "@mantine/modals";
import { IconMail, IconPhone } from "@tabler/icons-react";
import { createModalId, useModalBlocking } from "@/lib/modals";
import { type ContactInfoLabels, ContactInfoSection } from "../info/ContactInfoSection";

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
      emails={emails}
      labels={labels}
      mode={blockingField}
      onEmailsChange={onEmailsChange}
      onPhonesChange={onPhonesChange}
      onSave={onSaveContactInfo}
      phones={phones}
      savingField={savingField}
      showTitle={false}
    />
  );
}

export interface OpenContactInfoModalParams {
  emails: EmailEntry[];
  emailTitle: string;
  labels: Partial<ContactInfoLabels>;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
  phones: PhoneEntry[];
  phoneTitle: string;
  savingField: string | null;
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
    children: (
      <ContactInfoModalBody
        blockingField="phones"
        emails={emails}
        labels={labels}
        modalId={modalId}
        onEmailsChange={onEmailsChange}
        onPhonesChange={onPhonesChange}
        onSaveContactInfo={onSaveContactInfo}
        phones={phones}
        savingField={savingField}
      />
    ),
    modalId,
    size: "lg",
    title: <ModalTitle icon={<IconPhone size={20} />} text={phoneTitle} />,
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
    children: (
      <ContactInfoModalBody
        blockingField="emails"
        emails={emails}
        labels={labels}
        modalId={modalId}
        onEmailsChange={onEmailsChange}
        onPhonesChange={onPhonesChange}
        onSaveContactInfo={onSaveContactInfo}
        phones={phones}
        savingField={savingField}
      />
    ),
    modalId,
    size: "lg",
    title: <ModalTitle icon={<IconMail size={20} />} text={emailTitle} />,
  });
}
