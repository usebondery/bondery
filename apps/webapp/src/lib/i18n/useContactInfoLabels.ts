"use client";

import { useMemo } from "react";
import { useWebTranslations as useTranslations } from "./useWebTranslations";
import type { ContactInfoLabels } from "@/app/(app)/app/person/[person_id]/components/ContactInfoSection";

export function useContactInfoLabels(): ContactInfoLabels {
  const t = useTranslations("ContactInfo");

  return useMemo(
    () => ({
      title: t("Title"),
      typeHome: t("TypeHome"),
      typeWork: t("TypeWork"),
      phoneNumbers: t("PhoneNumbers"),
      phonePlaceholder: t("PhonePlaceholder"),
      typeLabel: t("TypeLabel"),
      callAction: t("CallAction"),
      sendSmsAction: t("SendSmsAction"),
      copyAction: t("CopyAction"),
      copySuccessTitle: t("CopySuccessTitle"),
      phoneCopiedMessage: t("PhoneCopiedMessage"),
      emailCopiedMessage: t("EmailCopiedMessage"),
      invalidEmailTitle: t("InvalidEmailTitle"),
      invalidEmailMessage: t("InvalidEmailMessage"),
      setAsPreferred: t("SetAsPreferred"),
      deleteAction: t("DeleteAction"),
      addPhone: t("AddPhone"),
      emailAddresses: t("EmailAddresses"),
      emailPlaceholder: t("EmailPlaceholder"),
      sendEmailAction: t("SendEmailAction"),
      addEmail: t("AddEmail"),
      phonePrefixAriaLabel: t("PhonePrefixAccessibilityLabel"),
      phoneActionsAriaLabel: t("PhoneActionsAriaLabel"),
      emailActionsAriaLabel: t("EmailActionsAriaLabel"),
    }),
    [t],
  );
}
