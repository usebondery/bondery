"use client";

import {
  ActionIcon,
  Card,
  Flex,
  Group,
  Input,
  Loader,
  Menu,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconCopy,
  IconDotsVertical,
  IconMail,
  IconPlus,
  IconMailSpark,
  IconMessage,
  IconPhone,
  IconPhoneSpark,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import type { PhoneEntry, EmailEntry, ContactType } from "@bondery/types";
import {
  TELEPHONE_PREFIX_OPTIONS,
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
} from "@/lib/phoneHelpers";
import { EMAIL_TYPE_OPTIONS, PHONE_TYPE_OPTIONS } from "@/lib/config";
import { ActionIconLink } from "@bondery/mantine-next";
import { TypePicker } from "@/app/(app)/app/components/shared/TypePicker";
import { notifications } from "@mantine/notifications";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";

const MAX_ENTRIES = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactInfoSectionProps {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  savingField: string | null;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSave: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
  mode?: "all" | "phones" | "emails";
  showTitle?: boolean;
  labels?: Partial<ContactInfoLabels>;
}

export interface ContactInfoLabels {
  title: string;
  typeHome: string;
  typeWork: string;
  phoneNumbers: string;
  phonePlaceholder: string;
  typeLabel: string;
  callAction: string;
  sendSmsAction: string;
  copyAction: string;
  copySuccessTitle: string;
  phoneCopiedMessage: string;
  emailCopiedMessage: string;
  invalidEmailTitle: string;
  invalidEmailMessage: string;
  setAsPreferred: string;
  deleteAction: string;
  addPhone: string;
  emailAddresses: string;
  emailPlaceholder: string;
  sendEmailAction: string;
  addEmail: string;
}

const DEFAULT_CONTACT_INFO_LABELS: ContactInfoLabels = {
  title: "Contact Info",
  typeHome: "Home",
  typeWork: "Work",
  phoneNumbers: "Phone numbers",
  phonePlaceholder: "Phone number",
  typeLabel: "Type",
  callAction: "Call",
  sendSmsAction: "Send SMS",
  copyAction: "Copy",
  copySuccessTitle: "Success",
  phoneCopiedMessage: "Phone number copied to clipboard",
  emailCopiedMessage: "Email address copied to clipboard",
  invalidEmailTitle: "Invalid email",
  invalidEmailMessage: "Please enter a valid email address",
  setAsPreferred: "Set as preferred",
  deleteAction: "Delete",
  addPhone: "Add phone",
  emailAddresses: "Email addresses",
  emailPlaceholder: "Email address",
  sendEmailAction: "Send email",
  addEmail: "Add email",
};

function createDraftPhone(): PhoneEntry {
  return {
    prefix: "+1",
    value: "",
    type: "home",
    preferred: false,
  };
}

function createDraftEmail(): EmailEntry {
  return {
    value: "",
    type: "home",
    preferred: false,
  };
}

function PrefixSelect({
  value,
  onChange,
  style,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  const selected = TELEPHONE_PREFIX_OPTIONS.find((option) => option.value === value);

  return (
    <Select
      value={value}
      onChange={(val) => onChange(val || "+1")}
      data={TELEPHONE_PREFIX_OPTIONS}
      renderOption={({ option }) => {
        const country = TELEPHONE_PREFIX_OPTIONS.find((item) => item.value === option.value);
        return (
          <Group gap="xs">
            <span className={`fi fi-${country?.flag || "us"}`} />
            <span>{option.value}</span>
          </Group>
        );
      }}
      leftSection={<span className={`fi fi-${selected?.flag || "us"}`} />}
      searchable
      size="sm"
      style={style}
      aria-label={ariaLabel}
    />
  );
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
  const text: ContactInfoLabels = {
    ...DEFAULT_CONTACT_INFO_LABELS,
    ...labels,
  };

  const phoneTypeOptions = PHONE_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.value === "home" ? text.typeHome : text.typeWork,
    emoji: option.emoji,
  }));

  const emailTypeOptions = EMAIL_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.value === "home" ? text.typeHome : text.typeWork,
    emoji: option.emoji,
  }));

  const [draftPhone, setDraftPhone] = useState<PhoneEntry>(createDraftPhone());
  const [draftEmail, setDraftEmail] = useState<EmailEntry>(createDraftEmail());
  const [localPhones, setLocalPhones] = useState<PhoneEntry[]>(phones);
  const [localEmails, setLocalEmails] = useState<EmailEntry[]>(emails);

  const showInvalidEmailNotification = () => {
    notifications.show(
      errorNotificationTemplate({
        title: text.invalidEmailTitle,
        description: text.invalidEmailMessage,
      }),
    );
  };

  const hasInvalidEmail = (entries: EmailEntry[]) =>
    entries.some((email) => {
      const normalized = email.value.trim();
      return Boolean(normalized) && !EMAIL_REGEX.test(normalized);
    });

  useEffect(() => {
    setLocalPhones(phones);
  }, [phones]);

  useEffect(() => {
    setLocalEmails(emails);
  }, [emails]);

  const isPhoneLimitReached = localPhones.length >= MAX_ENTRIES;
  const isEmailLimitReached = localEmails.length >= MAX_ENTRIES;
  const showPhones = mode !== "emails";
  const showEmails = mode !== "phones";

  const persistPhones = (nextPhones: PhoneEntry[]) => {
    setLocalPhones(nextPhones);
    onPhonesChange(nextPhones);
    onSave({ phones: nextPhones });
  };

  const persistEmails = (nextEmails: EmailEntry[]) => {
    if (hasInvalidEmail(nextEmails)) {
      showInvalidEmailNotification();
      return;
    }

    setLocalEmails(nextEmails);
    onEmailsChange(nextEmails);
    onSave({ emails: nextEmails });
  };

  const saveCurrentPhones = () => {
    onPhonesChange(localPhones);
    onSave({ phones: localPhones });
  };

  const saveCurrentEmails = () => {
    if (hasInvalidEmail(localEmails)) {
      showInvalidEmailNotification();
      return;
    }

    onEmailsChange(localEmails);
    onSave({ emails: localEmails });
  };

  const handleCommitDraftPhone = () => {
    const nextValue = draftPhone.value.trim();
    if (!nextValue || isPhoneLimitReached) {
      return;
    }

    const nextPhone: PhoneEntry = {
      ...draftPhone,
      value: nextValue,
      preferred: localPhones.length === 0,
    };

    const nextPhones = [...localPhones, nextPhone];
    persistPhones(nextPhones);
    setDraftPhone(createDraftPhone());
  };

  const handleRemovePhone = (index: number) => {
    const newPhones = localPhones.filter((_, i) => i !== index);
    // If we removed the preferred one, make the first one preferred
    if (localPhones[index].preferred && newPhones.length > 0) {
      newPhones[0].preferred = true;
    }
    persistPhones(newPhones);
  };

  const handlePhoneChange = (index: number, value: string) => {
    const rawValue = value.replace(/\D/g, "");
    const parsed = parsePhoneNumber(value);
    const newPhones = [...localPhones];

    if (parsed && value.includes("+")) {
      // User pasted a full number with prefix
      newPhones[index] = { ...newPhones[index], prefix: parsed.dialCode, value: parsed.number };
    } else {
      // User typed just the number part
      newPhones[index] = { ...newPhones[index], value: rawValue };
    }
    setLocalPhones(newPhones);
  };

  const handleDraftPhoneChange = (value: string) => {
    const rawValue = value.replace(/\D/g, "");
    const parsed = parsePhoneNumber(value);

    if (parsed && value.includes("+")) {
      setDraftPhone((previous) => ({
        ...previous,
        prefix: parsed.dialCode,
        value: parsed.number,
      }));
      return;
    }

    setDraftPhone((previous) => ({
      ...previous,
      value: rawValue,
    }));
  };

  const handlePhonePrefixChange = (index: number, prefix: string) => {
    const newPhones = [...localPhones];
    newPhones[index] = { ...newPhones[index], prefix };
    persistPhones(newPhones);
  };

  const handlePhoneTypeChange = (index: number, type: ContactType) => {
    const newPhones = [...localPhones];
    newPhones[index] = { ...newPhones[index], type };
    persistPhones(newPhones);
  };

  const handlePhonePreferredChange = (index: number) => {
    const newPhones = localPhones.map((phone, i) => ({
      ...phone,
      preferred: i === index,
    }));
    persistPhones(newPhones);
  };

  const handleCommitDraftEmail = () => {
    const nextValue = draftEmail.value.trim();
    if (!nextValue || isEmailLimitReached) {
      return;
    }

    if (!EMAIL_REGEX.test(nextValue)) {
      showInvalidEmailNotification();
      return;
    }

    const nextEmail: EmailEntry = {
      ...draftEmail,
      value: nextValue,
      preferred: localEmails.length === 0,
    };

    const nextEmails = [...localEmails, nextEmail];
    persistEmails(nextEmails);
    setDraftEmail(createDraftEmail());
  };

  const handleRemoveEmail = (index: number) => {
    const newEmails = localEmails.filter((_, i) => i !== index);
    // If we removed the preferred one, make the first one preferred
    if (localEmails[index].preferred && newEmails.length > 0) {
      newEmails[0].preferred = true;
    }
    persistEmails(newEmails);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...localEmails];
    newEmails[index] = { ...newEmails[index], value };
    setLocalEmails(newEmails);
  };

  const handleEmailTypeChange = (index: number, type: ContactType) => {
    const newEmails = [...localEmails];
    newEmails[index] = { ...newEmails[index], type };
    persistEmails(newEmails);
  };

  const handleEmailPreferredChange = (index: number) => {
    const newEmails = localEmails.map((email, i) => ({
      ...email,
      preferred: i === index,
    }));
    persistEmails(newEmails);
  };

  return (
    <div>
      {showTitle ? (
        <Text size="sm" fw={600} mb="md">
          {text.title}
        </Text>
      ) : null}
      <Flex gap="xl" direction={{ base: "column", md: "row" }}>
        {showPhones ? (
          <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
            {localPhones.map((phone, index) => (
              <Card
                key={index}
                withBorder
                p="sm"
                radius="md"
                style={{
                  position: "relative",
                  overflow: "visible",
                  borderColor: phone.preferred ? "var(--mantine-color-orange-6)" : undefined,
                }}
              >
                <Group gap="xs" align="center" wrap="nowrap">
                  <ActionIconLink
                    variant="light"
                    color={phone.preferred ? "orange" : "blue"}
                    href={
                      phone.prefix && phone.value ? `tel:${phone.prefix}${phone.value}` : undefined
                    }
                    disabled={!phone.value}
                    ariaLabel={text.phoneNumbers}
                    icon={phone.preferred ? <IconPhoneSpark size={18} /> : <IconPhone size={18} />}
                  />

                  <PrefixSelect
                    value={phone.prefix || "+1"}
                    onChange={(prefix) => handlePhonePrefixChange(index, prefix)}
                    style={{ flex: "0 0 110px" }}
                    ariaLabel="Phone prefix"
                  />

                  <Input
                    component={IMaskInput}
                    mask={getTelephoneReactMaskExpression(phone.prefix || "+1")}
                    unmask
                    placeholder={text.phonePlaceholder}
                    value={phone.value}
                    onAccept={(value: string) => handlePhoneChange(index, value)}
                    onBlur={saveCurrentPhones}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveCurrentPhones();
                      }
                    }}
                    style={{ flex: "1 1 auto" }}
                    rightSection={savingField === "phones" ? <Loader size="xs" /> : null}
                    disabled={savingField === "phones"}
                    size="sm"
                    aria-label={text.phonePlaceholder}
                  />

                  <TypePicker
                    value={phone.type}
                    onChange={(value) => handlePhoneTypeChange(index, value as ContactType)}
                    data={phoneTypeOptions}
                    style={{ flex: "0 0 110px" }}
                    size="sm"
                    ariaLabel={text.typeLabel}
                  />

                  <Menu withinPortal position="bottom-end">
                    <Menu.Target>
                      <ActionIcon
                        ml="auto"
                        variant="subtle"
                        disabled={savingField === "phones"}
                        aria-label="Phone actions"
                      >
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPhone size={14} />}
                        disabled={!phone.value}
                        onClick={() => {
                          if (typeof window !== "undefined" && phone.value) {
                            window.location.href = `tel:${phone.prefix}${phone.value}`;
                          }
                        }}
                      >
                        {text.callAction}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconMessage size={14} />}
                        disabled={!phone.value}
                        onClick={() => {
                          if (typeof window !== "undefined" && phone.value) {
                            window.location.href = `sms:${phone.prefix}${phone.value}`;
                          }
                        }}
                      >
                        {text.sendSmsAction}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        disabled={!phone.value}
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            `${phone.prefix || ""}${phone.value || ""}`,
                          );
                          notifications.show(
                            successNotificationTemplate({
                              title: text.copySuccessTitle,
                              description: text.phoneCopiedMessage,
                            }),
                          );
                        }}
                      >
                        {text.copyAction}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconStar size={14} />}
                        disabled={phone.preferred}
                        onClick={() => handlePhonePreferredChange(index)}
                      >
                        {text.setAsPreferred}
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleRemovePhone(index)}
                      >
                        {text.deleteAction}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Card>
            ))}

            {!isPhoneLimitReached ? (
              <Card withBorder p="sm" radius="md">
                <Group gap="xs" align="center" wrap="nowrap">
                  <Tooltip label={text.addPhone} withArrow>
                    <ActionIcon
                      variant="light"
                      color="green"
                      aria-label={text.addPhone}
                      onClick={handleCommitDraftPhone}
                      disabled={savingField === "phones"}
                    >
                      <IconPlus size={18} />
                    </ActionIcon>
                  </Tooltip>

                  <PrefixSelect
                    value={draftPhone.prefix || "+1"}
                    onChange={(prefix) => setDraftPhone((previous) => ({ ...previous, prefix }))}
                    style={{ flex: "0 0 110px" }}
                    ariaLabel="Phone prefix"
                  />

                  <Input
                    component={IMaskInput}
                    mask={getTelephoneReactMaskExpression(draftPhone.prefix || "+1")}
                    unmask
                    placeholder={text.phonePlaceholder}
                    value={draftPhone.value}
                    onAccept={(value: string) => handleDraftPhoneChange(value)}
                    onBlur={handleCommitDraftPhone}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCommitDraftPhone();
                      }
                    }}
                    style={{ flex: "1 1 auto" }}
                    disabled={savingField === "phones"}
                    size="sm"
                    aria-label={text.phonePlaceholder}
                  />

                  <TypePicker
                    value={draftPhone.type}
                    onChange={(value) =>
                      setDraftPhone((previous) => ({
                        ...previous,
                        type: (value as ContactType) || "home",
                      }))
                    }
                    data={phoneTypeOptions}
                    style={{ flex: "0 0 110px" }}
                    size="sm"
                    disabled={savingField === "phones"}
                    ariaLabel={text.typeLabel}
                  />
                </Group>
              </Card>
            ) : null}
          </Stack>
        ) : null}

        {showEmails ? (
          <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
            {localEmails.map((email, index) => (
              <Card
                key={index}
                withBorder
                p="sm"
                radius="md"
                style={{
                  position: "relative",
                  overflow: "visible",
                  borderColor: email.preferred ? "var(--mantine-color-orange-6)" : undefined,
                }}
              >
                <Group gap="xs" align="center" wrap="nowrap">
                  <ActionIconLink
                    variant="light"
                    color={email.preferred ? "orange" : "red"}
                    href={email.value ? `mailto:${email.value}` : undefined}
                    disabled={!email.value}
                    ariaLabel={text.emailAddresses}
                    icon={email.preferred ? <IconMailSpark size={18} /> : <IconMail size={18} />}
                  />

                  <TextInput
                    placeholder={text.emailPlaceholder}
                    value={email.value}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    onBlur={saveCurrentEmails}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveCurrentEmails();
                      }
                    }}
                    style={{ flex: 1 }}
                    rightSection={savingField === "emails" ? <Loader size="xs" /> : null}
                    disabled={savingField === "emails"}
                    size="sm"
                    aria-label={text.emailPlaceholder}
                  />

                  <TypePicker
                    value={email.type}
                    onChange={(value) => handleEmailTypeChange(index, value as ContactType)}
                    data={emailTypeOptions}
                    style={{ flex: "0 0 110px" }}
                    size="sm"
                    ariaLabel={text.typeLabel}
                  />

                  <Menu withinPortal position="bottom-end">
                    <Menu.Target>
                      <ActionIcon
                        ml="auto"
                        variant="subtle"
                        disabled={savingField === "emails"}
                        aria-label="Email actions"
                      >
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconMail size={14} />}
                        disabled={!email.value}
                        onClick={() => {
                          if (typeof window !== "undefined" && email.value) {
                            window.location.href = `mailto:${email.value}`;
                          }
                        }}
                      >
                        {text.sendEmailAction}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        disabled={!email.value}
                        onClick={() => {
                          void navigator.clipboard.writeText(email.value || "");
                          notifications.show(
                            successNotificationTemplate({
                              title: text.copySuccessTitle,
                              description: text.emailCopiedMessage,
                            }),
                          );
                        }}
                      >
                        {text.copyAction}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconStar size={14} />}
                        disabled={email.preferred}
                        onClick={() => handleEmailPreferredChange(index)}
                      >
                        {text.setAsPreferred}
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleRemoveEmail(index)}
                      >
                        {text.deleteAction}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Card>
            ))}

            {!isEmailLimitReached ? (
              <Card withBorder p="sm" radius="md">
                <Group gap="xs" align="center" wrap="nowrap">
                  <Tooltip label={text.addEmail} withArrow>
                    <ActionIcon
                      variant="light"
                      color="green"
                      aria-label={text.addEmail}
                      onClick={handleCommitDraftEmail}
                      disabled={savingField === "emails"}
                    >
                      <IconPlus size={18} />
                    </ActionIcon>
                  </Tooltip>

                  <TextInput
                    placeholder={text.emailPlaceholder}
                    value={draftEmail.value}
                    onChange={(event) =>
                      setDraftEmail((previous) => ({ ...previous, value: event.target.value }))
                    }
                    onBlur={handleCommitDraftEmail}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCommitDraftEmail();
                      }
                    }}
                    style={{ flex: 1 }}
                    disabled={savingField === "emails"}
                    size="sm"
                    aria-label={text.emailPlaceholder}
                  />

                  <TypePicker
                    value={draftEmail.type}
                    onChange={(value) =>
                      setDraftEmail((previous) => ({
                        ...previous,
                        type: (value as ContactType) || "home",
                      }))
                    }
                    data={emailTypeOptions}
                    style={{ flex: "0 0 110px" }}
                    size="sm"
                    disabled={savingField === "emails"}
                    ariaLabel={text.typeLabel}
                  />
                </Group>
              </Card>
            ) : null}
          </Stack>
        ) : null}
      </Flex>
    </div>
  );
}
