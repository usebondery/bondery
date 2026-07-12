"use client";

import type { Contact, EmailEntry, PhoneEntry } from "@bondery/schemas";
import { Button, Group } from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconMail,
  IconPhone,
  IconWorld,
} from "@tabler/icons-react";
import Image from "next/image";
import { useCallback, useMemo } from "react";
import {
  useCommonTranslations,
  useContactInfoTranslations,
  useSocialsTranslations,
  useValidationTranslations,
} from "@/lib/i18n/generated/hooks";
import { useContactInfoLabels } from "@/lib/i18n/useContactInfoLabels";
import { useSocialActionTooltips } from "@/lib/i18n/useSocialActionTooltips";
import { useSocialFieldEditor } from "../../hooks/useSocialFieldEditor";
import { openContactEmailsModal, openContactPhonesModal } from "../chrome/openContactInfoModals";
import { SocialPopoverButton } from "./SocialPopoverButton";
import { SocialPopoverField, type SocialPopoverFieldConfig } from "./SocialPopoverField";

interface SocialsSectionProps {
  contact: Contact;
  emails: EmailEntry[];
  onEmailsChange: (emails: EmailEntry[]) => void;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
  personId: string;
  phones: PhoneEntry[];
  savingField: string | null;
}

export function SocialsSection({
  contact,
  personId,
  phones,
  emails,
  savingField,
  onPhonesChange,
  onEmailsChange,
  onSaveContactInfo,
}: SocialsSectionProps) {
  const t = useSocialsTranslations();
  const tContactInfo = useContactInfoTranslations();
  const _tCommon = useCommonTranslations();
  const tVal = useValidationTranslations();
  const contactInfoLabels = useContactInfoLabels();
  const { getSocialActionTooltip } = useSocialActionTooltips();

  const fieldLabels = useMemo(
    () => ({
      facebook: t("FieldFacebook"),
      instagram: t("FieldInstagram"),
      linkedin: t("FieldLinkedin"),
      signal: t("FieldSignal"),
      website: t("FieldWebsite"),
      whatsapp: t("FieldWhatsapp"),
    }),
    [t],
  );

  const editor = useSocialFieldEditor({
    contact,
    fieldLabels,
    personId,
    validationErrorTitle: tVal("title"),
  });

  const socialFieldConfig = useMemo<SocialPopoverFieldConfig[]>(
    () => [
      {
        color: "blue",
        field: "linkedin",
        icon: <IconBrandLinkedin size={18} />,
        kind: "handle",
        label: t("FieldLinkedin"),
        placeholder: t("LinkedInPlaceholder"),
        target: "_blank",
        tooltipLabel: getSocialActionTooltip("linkedin", contact.firstName),
      },
      {
        color: "pink",
        field: "instagram",
        icon: <IconBrandInstagram size={18} />,
        kind: "handle",
        label: t("FieldInstagram"),
        placeholder: t("InstagramPlaceholder"),
        target: "_blank",
        tooltipLabel: getSocialActionTooltip("instagram", contact.firstName),
      },
      {
        color: "blue",
        field: "facebook",
        icon: <IconBrandFacebook size={18} />,
        kind: "handle",
        label: t("FieldFacebook"),
        placeholder: t("FacebookPlaceholder"),
        target: "_blank",
        tooltipLabel: getSocialActionTooltip("facebook", contact.firstName),
      },
      {
        color: "green",
        field: "whatsapp",
        icon: <IconBrandWhatsapp size={18} />,
        kind: "phone",
        label: t("FieldWhatsapp"),
        placeholder: t("WhatsAppPlaceholder"),
        target: "_blank",
        tooltipLabel: getSocialActionTooltip("whatsapp", contact.firstName),
      },
      {
        color: "cyan",
        field: "signal",
        icon: <Image alt="Signal" height={18} src="/icons/brands/signal.svg" width={18} />,
        kind: "phone",
        label: t("FieldSignal"),
        placeholder: t("SignalPlaceholder"),
        tooltipLabel: getSocialActionTooltip("signal", contact.firstName),
      },
      {
        color: "indigo",
        field: "website",
        icon: <IconWorld size={18} />,
        kind: "handle",
        label: t("FieldWebsite"),
        placeholder: t("WebsitePlaceholder"),
        target: "_blank",
        tooltipLabel: t("OpenWebsite"),
      },
    ],
    [contact.firstName, t, getSocialActionTooltip],
  );

  const preferredPhone =
    phones.find((phone) => phone.preferred && Boolean(phone.value)) ||
    phones.find((phone) => Boolean(phone.value));
  const preferredEmail =
    emails.find((email) => email.preferred && Boolean(email.value)) ||
    emails.find((email) => Boolean(email.value));
  const preferredPhoneHref = preferredPhone
    ? `tel:${preferredPhone.prefix}${preferredPhone.value}`
    : undefined;
  const preferredEmailHref = preferredEmail ? `mailto:${preferredEmail.value}` : undefined;

  const openPhoneModal = useCallback(() => {
    editor.clearCloseTimeout();
    editor.closeField("phone");
    openContactPhonesModal({
      emails,
      emailTitle: tContactInfo("EmailAddresses"),
      labels: contactInfoLabels,
      onEmailsChange,
      onPhonesChange,
      onSaveContactInfo,
      phones,
      phoneTitle: tContactInfo("PhoneNumbers"),
      savingField,
    });
  }, [
    contactInfoLabels,
    editor,
    emails,
    onEmailsChange,
    onPhonesChange,
    onSaveContactInfo,
    phones,
    savingField,
    tContactInfo,
  ]);

  const openEmailModal = useCallback(() => {
    editor.clearCloseTimeout();
    editor.closeField("email");
    openContactEmailsModal({
      emails,
      emailTitle: tContactInfo("EmailAddresses"),
      labels: contactInfoLabels,
      onEmailsChange,
      onPhonesChange,
      onSaveContactInfo,
      phones,
      phoneTitle: tContactInfo("PhoneNumbers"),
      savingField,
    });
  }, [
    contactInfoLabels,
    editor,
    emails,
    onEmailsChange,
    onPhonesChange,
    onSaveContactInfo,
    phones,
    savingField,
    tContactInfo,
  ]);

  return (
    <div>
      <Group align="center" gap="xs" wrap="wrap">
        <SocialPopoverButton
          ariaLabel={t("AriaPhone")}
          color="blue"
          disabled={!preferredPhoneHref}
          field="phone"
          href={preferredPhoneHref}
          icon={<IconPhone size={18} />}
          isOpen={editor.openField === "phone"}
          onCancelClose={editor.clearCloseTimeout}
          onHoverOpen={(field) => void editor.requestOpen(field)}
          onLinkClick={() => editor.closeField("phone")}
          onScheduleClose={editor.scheduleCloseField}
          tooltipLabel={getSocialActionTooltip("phone", contact.firstName)}
        >
          <Button onClick={openPhoneModal} size="xs" variant="subtle">
            {t("ViewAllPhones")}
          </Button>
        </SocialPopoverButton>

        <SocialPopoverButton
          ariaLabel={t("AriaEmail")}
          color="red"
          disabled={!preferredEmailHref}
          field="email"
          href={preferredEmailHref}
          icon={<IconMail size={18} />}
          isOpen={editor.openField === "email"}
          onCancelClose={editor.clearCloseTimeout}
          onHoverOpen={(field) => void editor.requestOpen(field)}
          onLinkClick={() => editor.closeField("email")}
          onScheduleClose={editor.scheduleCloseField}
          tooltipLabel={getSocialActionTooltip("email", contact.firstName)}
        >
          <Button onClick={openEmailModal} size="xs" variant="subtle">
            {t("ViewAllEmails")}
          </Button>
        </SocialPopoverButton>

        {socialFieldConfig.map((config) => (
          <SocialPopoverField
            config={config}
            editor={editor}
            fieldLabels={fieldLabels}
            key={config.field}
          />
        ))}
      </Group>
    </div>
  );
}
