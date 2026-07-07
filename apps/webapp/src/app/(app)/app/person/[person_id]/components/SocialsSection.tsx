"use client";

import { Button, Group } from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconMail,
  IconPhone,
  IconBrandWhatsapp,
  IconWorld,
} from "@tabler/icons-react";
import Image from "next/image";
import { useCallback, useMemo } from "react";
import type { Contact, EmailEntry, PhoneEntry } from "@bondery/schemas";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useContactInfoLabels } from "@/lib/i18n/useContactInfoLabels";
import { useSocialActionTooltips } from "@/lib/i18n/useSocialActionTooltips";
import {
  openContactEmailsModal,
  openContactPhonesModal,
} from "./openContactInfoModals";
import { SocialPopoverButton } from "./SocialPopoverButton";
import {
  SocialPopoverField,
  type SocialPopoverFieldConfig,
} from "./SocialPopoverField";
import { useSocialFieldEditor } from "./useSocialFieldEditor";

interface SocialsSectionProps {
  contact: Contact;
  personId: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  savingField: string | null;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
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
  const t = useTranslations("Socials");
  const tContactInfo = useTranslations("ContactInfo");
  const tCommon = useTranslations("WebAppCommon");
  const contactInfoLabels = useContactInfoLabels();
  const { getSocialActionTooltip } = useSocialActionTooltips();

  const fieldLabels = useMemo(
    () => ({
      linkedin: t("FieldLinkedin"),
      instagram: t("FieldInstagram"),
      facebook: t("FieldFacebook"),
      whatsapp: t("FieldWhatsapp"),
      signal: t("FieldSignal"),
      website: t("FieldWebsite"),
    }),
    [t],
  );

  const editor = useSocialFieldEditor({
    contact,
    personId,
    fieldLabels,
    t,
    tCommon,
  });

  const socialFieldConfig = useMemo<SocialPopoverFieldConfig[]>(
    () => [
      {
        field: "linkedin",
        color: "blue",
        label: t("FieldLinkedin"),
        placeholder: t("LinkedInPlaceholder"),
        tooltipLabel: getSocialActionTooltip("linkedin", contact.firstName),
        target: "_blank",
        kind: "handle",
        icon: <IconBrandLinkedin size={18} />,
      },
      {
        field: "instagram",
        color: "pink",
        label: t("FieldInstagram"),
        placeholder: t("InstagramPlaceholder"),
        tooltipLabel: getSocialActionTooltip("instagram", contact.firstName),
        target: "_blank",
        kind: "handle",
        icon: <IconBrandInstagram size={18} />,
      },
      {
        field: "facebook",
        color: "blue",
        label: t("FieldFacebook"),
        placeholder: t("FacebookPlaceholder"),
        tooltipLabel: getSocialActionTooltip("facebook", contact.firstName),
        target: "_blank",
        kind: "handle",
        icon: <IconBrandFacebook size={18} />,
      },
      {
        field: "whatsapp",
        color: "green",
        label: t("FieldWhatsapp"),
        placeholder: t("WhatsAppPlaceholder"),
        tooltipLabel: getSocialActionTooltip("whatsapp", contact.firstName),
        target: "_blank",
        kind: "phone",
        icon: <IconBrandWhatsapp size={18} />,
      },
      {
        field: "signal",
        color: "cyan",
        label: t("FieldSignal"),
        placeholder: t("SignalPlaceholder"),
        tooltipLabel: getSocialActionTooltip("signal", contact.firstName),
        kind: "phone",
        icon: <Image src="/icons/brands/signal.svg" alt="Signal" width={18} height={18} />,
      },
      {
        field: "website",
        color: "indigo",
        label: t("FieldWebsite"),
        placeholder: t("WebsitePlaceholder"),
        tooltipLabel: t("OpenWebsite"),
        target: "_blank",
        kind: "handle",
        icon: <IconWorld size={18} />,
      },
    ],
    [contact.firstName, t],
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
      phones,
      emails,
      savingField,
      onPhonesChange,
      onEmailsChange,
      onSaveContactInfo,
      labels: contactInfoLabels,
      phoneTitle: tContactInfo("PhoneNumbers"),
      emailTitle: tContactInfo("EmailAddresses"),
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
      phones,
      emails,
      savingField,
      onPhonesChange,
      onEmailsChange,
      onSaveContactInfo,
      labels: contactInfoLabels,
      phoneTitle: tContactInfo("PhoneNumbers"),
      emailTitle: tContactInfo("EmailAddresses"),
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
      <Group gap="xs" align="center" wrap="wrap">
        <SocialPopoverButton
          field="phone"
          isOpen={editor.openField === "phone"}
          color="blue"
          ariaLabel={t("AriaPhone")}
          tooltipLabel={getSocialActionTooltip("phone", contact.firstName)}
          href={preferredPhoneHref}
          disabled={!preferredPhoneHref}
          onHoverOpen={(field) => void editor.requestOpen(field)}
          onLinkClick={() => editor.closeField("phone")}
          onScheduleClose={editor.scheduleCloseField}
          onCancelClose={editor.clearCloseTimeout}
          icon={<IconPhone size={18} />}
        >
          <Button variant="subtle" size="xs" onClick={openPhoneModal}>
            {t("ViewAllPhones")}
          </Button>
        </SocialPopoverButton>

        <SocialPopoverButton
          field="email"
          isOpen={editor.openField === "email"}
          color="red"
          ariaLabel={t("AriaEmail")}
          tooltipLabel={getSocialActionTooltip("email", contact.firstName)}
          href={preferredEmailHref}
          disabled={!preferredEmailHref}
          onHoverOpen={(field) => void editor.requestOpen(field)}
          onLinkClick={() => editor.closeField("email")}
          onScheduleClose={editor.scheduleCloseField}
          onCancelClose={editor.clearCloseTimeout}
          icon={<IconMail size={18} />}
        >
          <Button variant="subtle" size="xs" onClick={openEmailModal}>
            {t("ViewAllEmails")}
          </Button>
        </SocialPopoverButton>

        {socialFieldConfig.map((config) => (
          <SocialPopoverField
            key={config.field}
            config={config}
            editor={editor}
            fieldLabels={fieldLabels}
          />
        ))}
      </Group>
    </div>
  );
}
