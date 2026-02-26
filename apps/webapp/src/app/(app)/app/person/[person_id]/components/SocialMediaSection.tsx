"use client";

import { Button, Group, Input, Loader, Popover, Select, Tooltip } from "@mantine/core";
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
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Contact, EmailEntry, PhoneEntry } from "@bondery/types";
import { IMaskInput } from "react-imask";
import { useTranslations } from "next-intl";
import {
  combinePhoneNumber,
  countryCodes,
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
} from "@/lib/phoneHelpers";
import { createSocialMediaUrl, extractUsername } from "@/lib/socialMediaHelpers";
import {
  ActionIconLink,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { ContactInfoSection, type ContactInfoLabels } from "./ContactInfoSection";
import { InlineEditableInput } from "./InlineEditableInput";

interface SocialMediaSectionProps {
  contact: Contact;
  personId: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  savingField: string | null;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSaveContactInfo: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
}

type SocialFieldKey = "linkedin" | "instagram" | "facebook" | "website" | "whatsapp" | "signal";

type SocialFieldValues = Record<SocialFieldKey, string>;

const PREFIX_OPTIONS = Array.from(
  new Map(
    countryCodes.map((country) => [
      country.dialCode,
      {
        value: country.dialCode,
        label: country.dialCode,
      },
    ]),
  ).values(),
);

const DIAL_CODE_TO_FLAG = new Map(countryCodes.map((country) => [country.dialCode, country.flag]));

function getFlagForDialCode(dialCode: string): string {
  return DIAL_CODE_TO_FLAG.get(dialCode) || "us";
}

function normalizeWebsiteUrl(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(candidate);
    const isHttpProtocol = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";

    if (!isHttpProtocol || !parsedUrl.hostname.includes(".")) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function getInitialValues(contact: Contact): SocialFieldValues {
  const whatsappParsed = parsePhoneNumber(contact.whatsapp || "");
  const signalParsed = parsePhoneNumber(contact.signal || "");

  return {
    linkedin: contact.linkedin || "",
    instagram: contact.instagram || "",
    facebook: contact.facebook || "",
    website: contact.website || "",
    whatsapp: whatsappParsed?.number || "",
    signal: signalParsed?.number || "",
  };
}

function getPersistedValues(contact: Contact): SocialFieldValues {
  return {
    linkedin: contact.linkedin || "",
    instagram: contact.instagram || "",
    facebook: contact.facebook || "",
    website: contact.website || "",
    whatsapp: contact.whatsapp || "",
    signal: contact.signal || "",
  };
}

const PrefixSelect = memo(function PrefixSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const selectedFlag = useMemo(() => getFlagForDialCode(value), [value]);

  return (
    <Select
      value={value}
      onChange={(val) => onChange(val || "+1")}
      data={PREFIX_OPTIONS}
      renderOption={({ option }) => (
        <Group gap="xs">
          <span className={`fi fi-${getFlagForDialCode(option.value)}`} />
          <span>{option.value}</span>
        </Group>
      )}
      leftSection={<span className={`fi fi-${selectedFlag}`} />}
      searchable
      style={{ width: 100 }}
      size="sm"
    />
  );
});

interface SocialPopoverButtonProps {
  field: string;
  isOpen: boolean;
  color: string;
  ariaLabel: string;
  tooltipLabel: string;
  disabled?: boolean;
  href?: string;
  target?: "_blank";
  icon: ReactNode;
  onOpen: (field: string) => void;
  onScheduleClose: (field: string) => void;
  children: ReactNode;
}

function SocialPopoverButton({
  field,
  isOpen,
  color,
  ariaLabel,
  tooltipLabel,
  disabled,
  href,
  target,
  icon,
  onOpen,
  onScheduleClose,
  children,
}: SocialPopoverButtonProps) {
  return (
    <Popover
      opened={isOpen}
      position="bottom-start"
      withArrow
      shadow="md"
      withinPortal={false}
      zIndex={100}
      offset={8}
    >
      <Popover.Target>
        <Group
          gap={0}
          onMouseEnter={() => onOpen(field)}
          onMouseLeave={() => onScheduleClose(field)}
          onFocusCapture={() => onOpen(field)}
          onBlurCapture={(event) => {
            const nextFocused = event.relatedTarget as Node | null;
            if (!event.currentTarget.contains(nextFocused)) {
              onScheduleClose(field);
            }
          }}
        >
          <Tooltip label={tooltipLabel} withArrow>
            <span>
              <ActionIconLink
                variant="light"
                color={color}
                size="lg"
                href={href}
                target={target}
                ariaLabel={ariaLabel}
                disabled={disabled}
                icon={icon}
              />
            </span>
          </Tooltip>
        </Group>
      </Popover.Target>

      <Popover.Dropdown
        onMouseEnter={() => onOpen(field)}
        onMouseLeave={() => onScheduleClose(field)}
        p="sm"
      >
        {children}
      </Popover.Dropdown>
    </Popover>
  );
}

export function SocialMediaSection({
  contact,
  personId,
  phones,
  emails,
  savingField,
  onPhonesChange,
  onEmailsChange,
  onSaveContactInfo,
}: SocialMediaSectionProps) {
  const t = useTranslations("SocialMedia");
  const tContactInfo = useTranslations("ContactInfo");
  const [values, setValues] = useState<SocialFieldValues>(() => getInitialValues(contact));
  const [persistedValues, setPersistedValues] = useState<SocialFieldValues>(() =>
    getPersistedValues(contact),
  );
  const valuesRef = useRef<SocialFieldValues>(getInitialValues(contact));
  const [savingByField, setSavingByField] = useState<Record<SocialFieldKey, boolean>>({
    linkedin: false,
    instagram: false,
    facebook: false,
    website: false,
    whatsapp: false,
    signal: false,
  });
  const [whatsappPrefix, setWhatsappPrefix] = useState(
    parsePhoneNumber(contact.whatsapp || "")?.dialCode || "+1",
  );
  const [signalPrefix, setSignalPrefix] = useState(
    parsePhoneNumber(contact.signal || "")?.dialCode || "+1",
  );
  const [openField, setOpenField] = useState<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const persistedValuesRef = useRef<SocialFieldValues>(getPersistedValues(contact));
  const hasWhatsAppValue = Boolean(parsePhoneNumber(persistedValues.whatsapp || "")?.number.trim());
  const hasSignalValue = Boolean(parsePhoneNumber(persistedValues.signal || "")?.number.trim());
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
  const contactInfoLabels = useMemo<ContactInfoLabels>(
    () => ({
      title: tContactInfo("Title"),
      typeHome: tContactInfo("TypeHome"),
      typeWork: tContactInfo("TypeWork"),
      phoneNumbers: tContactInfo("PhoneNumbers"),
      phonePlaceholder: tContactInfo("PhonePlaceholder"),
      typeLabel: tContactInfo("TypeLabel"),
      callAction: tContactInfo("CallAction"),
      sendSmsAction: tContactInfo("SendSmsAction"),
      copyAction: tContactInfo("CopyAction"),
      copySuccessTitle: tContactInfo("CopySuccessTitle"),
      phoneCopiedMessage: tContactInfo("PhoneCopiedMessage"),
      emailCopiedMessage: tContactInfo("EmailCopiedMessage"),
      invalidEmailTitle: tContactInfo("InvalidEmailTitle"),
      invalidEmailMessage: tContactInfo("InvalidEmailMessage"),
      setAsPreferred: tContactInfo("SetAsPreferred"),
      deleteAction: tContactInfo("DeleteAction"),
      addPhone: tContactInfo("AddPhone"),
      emailAddresses: tContactInfo("EmailAddresses"),
      emailPlaceholder: tContactInfo("EmailPlaceholder"),
      sendEmailAction: tContactInfo("SendEmailAction"),
      addEmail: tContactInfo("AddEmail"),
    }),
    [tContactInfo],
  );

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openPopover = useCallback(
    (field: string) => {
      clearCloseTimeout();
      setOpenField(field);
    },
    [clearCloseTimeout],
  );

  const scheduleClosePopover = useCallback(
    (field: string) => {
      clearCloseTimeout();
      closeTimeoutRef.current = window.setTimeout(() => {
        setOpenField((previous) => (previous === field ? null : previous));
      }, 140);
    },
    [clearCloseTimeout],
  );

  useEffect(
    () => () => {
      clearCloseTimeout();
    },
    [clearCloseTimeout],
  );

  useEffect(() => {
    const nextValues = getInitialValues(contact);
    const nextPersisted = getPersistedValues(contact);
    setValues(nextValues);
    valuesRef.current = nextValues;
    setPersistedValues(nextPersisted);
    persistedValuesRef.current = nextPersisted;
    setWhatsappPrefix(parsePhoneNumber(nextPersisted.whatsapp || "")?.dialCode || "+1");
    setSignalPrefix(parsePhoneNumber(nextPersisted.signal || "")?.dialCode || "+1");
  }, [contact, personId]);

  const handleValueChange = (field: SocialFieldKey, value: string) => {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));
    valuesRef.current = {
      ...valuesRef.current,
      [field]: value,
    };
  };

  const saveField = useCallback(
    async (field: SocialFieldKey) => {
      const inputValue = valuesRef.current[field] || "";
      let processedValue = inputValue;

      if (["linkedin", "instagram", "facebook", "whatsapp"].includes(field)) {
        processedValue = extractUsername(field, inputValue);
      }

      if (field === "whatsapp") {
        processedValue = combinePhoneNumber(whatsappPrefix, inputValue);
      } else if (field === "signal") {
        processedValue = combinePhoneNumber(signalPrefix, inputValue);
      } else if (field === "website") {
        const normalizedWebsite = normalizeWebsiteUrl(inputValue);

        if (normalizedWebsite === null) {
          notifications.show(
            errorNotificationTemplate({
              title: "Invalid URL",
              description: "Please enter a valid website URL",
            }),
          );
          return;
        }

        processedValue = normalizedWebsite;
      }

      if (processedValue === persistedValuesRef.current[field]) {
        return;
      }

      setSavingByField((previous) => ({
        ...previous,
        [field]: true,
      }));

      try {
        const response = await fetch(`${API_ROUTES.CONTACTS}/${personId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: processedValue }),
        });

        if (!response.ok) {
          throw new Error("Failed to update");
        }

        persistedValuesRef.current[field] = processedValue;
        setPersistedValues((previous) => ({
          ...previous,
          [field]: processedValue,
        }));

        if (field === "whatsapp" || field === "signal") {
          const parsed = parsePhoneNumber(processedValue);
          if (parsed) {
            setValues((previous) => ({
              ...previous,
              [field]: parsed.number,
            }));
          }
        } else if (field !== "website") {
          setValues((previous) => ({
            ...previous,
            [field]: processedValue,
          }));
        } else {
          setValues((previous) => ({
            ...previous,
            website: processedValue,
          }));
          valuesRef.current = {
            ...valuesRef.current,
            website: processedValue,
          };
        }

        notifications.show(
          successNotificationTemplate({
            title: "Success",
            description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`,
          }),
        );
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: `Failed to update ${field}`,
          }),
        );
      } finally {
        setSavingByField((previous) => ({
          ...previous,
          [field]: false,
        }));
      }
    },
    [personId, signalPrefix, whatsappPrefix],
  );

  const getWebsiteUrl = (website: string | null): string | undefined => {
    if (!website) {
      return undefined;
    }

    if (website.startsWith("http://") || website.startsWith("https://")) {
      return website;
    }

    return normalizeWebsiteUrl(website) || undefined;
  };

  const handleNumberChange = (
    field: "whatsapp" | "signal",
    value: string,
    prefixSetter: (v: string) => void,
  ) => {
    const parsed = parsePhoneNumber(value);
    if (parsed && value.includes("+")) {
      prefixSetter(parsed.dialCode);
      handleValueChange(field, parsed.number);
      return;
    }
    handleValueChange(field, value);
  };

  const openPhoneModal = useCallback(() => {
    clearCloseTimeout();
    setOpenField(null);
    modals.open({
      title: <ModalTitle text={tContactInfo("PhoneNumbers")} icon={<IconPhone size={20} />} />,
      size: "lg",
      children: (
        <ContactInfoSection
          phones={phones}
          emails={emails}
          savingField={savingField}
          onPhonesChange={onPhonesChange}
          onEmailsChange={onEmailsChange}
          onSave={onSaveContactInfo}
          mode="phones"
          showTitle={false}
          labels={contactInfoLabels}
        />
      ),
    });
  }, [
    clearCloseTimeout,
    emails,
    onEmailsChange,
    onPhonesChange,
    onSaveContactInfo,
    phones,
    savingField,
    contactInfoLabels,
    tContactInfo,
  ]);

  const openEmailModal = useCallback(() => {
    clearCloseTimeout();
    setOpenField(null);
    modals.open({
      title: <ModalTitle text={tContactInfo("EmailAddresses")} icon={<IconMail size={20} />} />,
      size: "lg",
      children: (
        <ContactInfoSection
          phones={phones}
          emails={emails}
          savingField={savingField}
          onPhonesChange={onPhonesChange}
          onEmailsChange={onEmailsChange}
          onSave={onSaveContactInfo}
          mode="emails"
          showTitle={false}
          labels={contactInfoLabels}
        />
      ),
    });
  }, [
    clearCloseTimeout,
    emails,
    onEmailsChange,
    onPhonesChange,
    onSaveContactInfo,
    phones,
    savingField,
    contactInfoLabels,
    tContactInfo,
  ]);

  return (
    <div>
      <Group gap="xs" align="center" wrap="wrap">
        <SocialPopoverButton
          field="phone"
          isOpen={openField === "phone"}
          color="blue"
          ariaLabel="Phone"
          tooltipLabel={t("OpenPhone")}
          href={preferredPhoneHref}
          disabled={!preferredPhoneHref}
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<IconPhone size={18} />}
        >
          <Button variant="subtle" size="xs" onClick={openPhoneModal}>
            {t("ViewAllPhones")}
          </Button>
        </SocialPopoverButton>

        <SocialPopoverButton
          field="email"
          isOpen={openField === "email"}
          color="red"
          ariaLabel="Email"
          tooltipLabel={t("OpenEmail")}
          href={preferredEmailHref}
          disabled={!preferredEmailHref}
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<IconMail size={18} />}
        >
          <Button variant="subtle" size="xs" onClick={openEmailModal}>
            {t("ViewAllEmails")}
          </Button>
        </SocialPopoverButton>

        <SocialPopoverButton
          field="linkedin"
          isOpen={openField === "linkedin"}
          color="blue"
          ariaLabel="LinkedIn"
          tooltipLabel={t("OpenInLinkedIn")}
          href={
            persistedValues.linkedin
              ? createSocialMediaUrl("linkedin", persistedValues.linkedin)
              : undefined
          }
          disabled={!persistedValues.linkedin}
          target="_blank"
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<IconBrandLinkedin size={18} />}
        >
          <InlineEditableInput
            aria-label="LinkedIn"
            placeholder={t("LinkedInPlaceholder")}
            value={values.linkedin}
            onChange={(value) => handleValueChange("linkedin", value)}
            onBlur={() => void saveField("linkedin")}
            style={{ width: 280 }}
            isSaving={savingByField.linkedin}
            autoFocus
          />
        </SocialPopoverButton>

        <SocialPopoverButton
          field="instagram"
          isOpen={openField === "instagram"}
          color="pink"
          ariaLabel="Instagram"
          tooltipLabel={t("OpenInInstagram")}
          href={
            persistedValues.instagram
              ? createSocialMediaUrl("instagram", persistedValues.instagram)
              : undefined
          }
          disabled={!persistedValues.instagram}
          target="_blank"
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<IconBrandInstagram size={18} />}
        >
          <InlineEditableInput
            aria-label="Instagram"
            placeholder={t("InstagramPlaceholder")}
            value={values.instagram}
            onChange={(value) => handleValueChange("instagram", value)}
            onBlur={() => void saveField("instagram")}
            style={{ width: 280 }}
            isSaving={savingByField.instagram}
            autoFocus
          />
        </SocialPopoverButton>

        <SocialPopoverButton
          field="facebook"
          isOpen={openField === "facebook"}
          color="blue"
          ariaLabel="Facebook"
          tooltipLabel={t("OpenInFacebook")}
          href={
            persistedValues.facebook
              ? createSocialMediaUrl("facebook", persistedValues.facebook)
              : undefined
          }
          disabled={!persistedValues.facebook}
          target="_blank"
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<IconBrandFacebook size={18} />}
        >
          <InlineEditableInput
            aria-label="Facebook"
            placeholder={t("FacebookPlaceholder")}
            value={values.facebook}
            onChange={(value) => handleValueChange("facebook", value)}
            onBlur={() => void saveField("facebook")}
            style={{ width: 280 }}
            isSaving={savingByField.facebook}
            autoFocus
          />
        </SocialPopoverButton>

        <SocialPopoverButton
          field="whatsapp"
          isOpen={openField === "whatsapp"}
          color="green"
          ariaLabel="WhatsApp"
          tooltipLabel={t("OpenInWhatsApp")}
          href={
            hasWhatsAppValue
              ? createSocialMediaUrl("whatsapp", persistedValues.whatsapp)
              : undefined
          }
          disabled={!hasWhatsAppValue}
          target="_blank"
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<IconBrandWhatsapp size={18} />}
        >
          <Group gap="xs" wrap="nowrap" align="center" style={{ width: 390 }}>
            <PrefixSelect value={whatsappPrefix} onChange={setWhatsappPrefix} />
            <Input
              component={IMaskInput}
              mask={getTelephoneReactMaskExpression(whatsappPrefix)}
              unmask
              aria-label="WhatsApp"
              placeholder={t("WhatsAppPlaceholder")}
              value={values.whatsapp}
              onAccept={(value: string) =>
                handleNumberChange("whatsapp", value || "", setWhatsappPrefix)
              }
              onBlur={() => void saveField("whatsapp")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveField("whatsapp");
                }
              }}
              style={{ flex: "1 1 auto" }}
              rightSection={savingByField.whatsapp ? <Loader size="xs" /> : null}
              disabled={savingByField.whatsapp}
              size="sm"
              autoFocus
            />
          </Group>
        </SocialPopoverButton>

        <SocialPopoverButton
          field="signal"
          isOpen={openField === "signal"}
          color="cyan"
          ariaLabel="Signal"
          tooltipLabel={t("OpenInSignal")}
          href={
            hasSignalValue
              ? `signal://signal.me/#p/${persistedValues.signal.replace(/\D/g, "")}`
              : undefined
          }
          disabled={!hasSignalValue}
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<Image src="/icons/signal.svg" alt="Signal" width={18} height={18} />}
        >
          <Group gap="xs" wrap="nowrap" align="center" style={{ width: 390 }}>
            <PrefixSelect value={signalPrefix} onChange={setSignalPrefix} />
            <Input
              component={IMaskInput}
              mask={getTelephoneReactMaskExpression(signalPrefix)}
              unmask
              aria-label="Signal"
              placeholder={t("SignalPlaceholder")}
              value={values.signal}
              onAccept={(value: string) =>
                handleNumberChange("signal", value || "", setSignalPrefix)
              }
              onBlur={() => void saveField("signal")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveField("signal");
                }
              }}
              style={{ flex: "1 1 auto" }}
              rightSection={savingByField.signal ? <Loader size="xs" /> : null}
              disabled={savingByField.signal}
              size="sm"
              autoFocus
            />
          </Group>
        </SocialPopoverButton>

        <SocialPopoverButton
          field="website"
          isOpen={openField === "website"}
          color="indigo"
          ariaLabel="Website"
          tooltipLabel={t("OpenWebsite")}
          href={getWebsiteUrl(persistedValues.website)}
          disabled={!persistedValues.website}
          target="_blank"
          onOpen={openPopover}
          onScheduleClose={scheduleClosePopover}
          icon={<IconWorld size={18} />}
        >
          <InlineEditableInput
            aria-label="Website"
            placeholder={t("WebsitePlaceholder")}
            value={values.website}
            onChange={(value) => handleValueChange("website", value)}
            onBlur={() => void saveField("website")}
            style={{ width: 280 }}
            isSaving={savingByField.website}
            autoFocus
          />
        </SocialPopoverButton>
      </Group>
    </div>
  );
}
