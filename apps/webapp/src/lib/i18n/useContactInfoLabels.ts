"use client";

import { useMemo } from "react";
import type { ContactInfoLabels } from "@/lib/contacts/contact-info-labels";
import { useContactInfoTranslations, useValidationTranslations } from "@/lib/i18n/generated/hooks";

export function useContactInfoLabels(): ContactInfoLabels {
  const t = useContactInfoTranslations();
  const tVal = useValidationTranslations("email");

  return useMemo(
    () => ({
      addEmail: t("AddEmail"),
      addPhone: t("AddPhone"),
      callAction: t("CallAction"),
      copyAction: t("CopyAction"),
      copySuccessTitle: t("CopySuccessTitle"),
      deleteAction: t("DeleteAction"),
      emailActionsAriaLabel: t("EmailActionsAriaLabel"),
      emailAddresses: t("EmailAddresses"),
      emailCopiedMessage: t("EmailCopiedMessage"),
      emailPlaceholder: t("EmailPlaceholder"),
      invalidEmailMessage: tVal("invalid"),
      invalidEmailTitle: tVal("invalidTitle"),
      phoneActionsAriaLabel: t("PhoneActionsAriaLabel"),
      phoneCopiedMessage: t("PhoneCopiedMessage"),
      phoneNumbers: t("PhoneNumbers"),
      phonePlaceholder: t("PhonePlaceholder"),
      phonePrefixAriaLabel: t("PhonePrefixAccessibilityLabel"),
      sendEmailAction: t("SendEmailAction"),
      sendSmsAction: t("SendSmsAction"),
      setAsPreferred: t("SetAsPreferred"),
      title: t("Title"),
      typeHome: t("TypeHome"),
      typeLabel: t("TypeLabel"),
      typeWork: t("TypeWork"),
    }),
    [t, tVal],
  );
}
