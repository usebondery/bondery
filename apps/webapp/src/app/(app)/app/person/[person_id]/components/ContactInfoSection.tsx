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
  IconDotsVertical,
  IconMail,
  IconPlus,
  IconMailSpark,
  IconPhone,
  IconPhoneSpark,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import { useTranslations } from "next-intl";
import type { PhoneEntry, EmailEntry, ContactType } from "@bondery/types";
import {
  TELEPHONE_PREFIX_OPTIONS,
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
} from "@/lib/phoneHelpers";
import { CONTACT_METHOD_TYPE_OPTIONS } from "@/lib/config";

const MAX_ENTRIES = 5;

interface ContactInfoSectionProps {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  savingField: string | null;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSave: (payload?: { phones?: PhoneEntry[]; emails?: EmailEntry[] }) => void;
}

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
}: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
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
}: ContactInfoSectionProps) {
  const t = useTranslations("ContactInfo");

  const contactTypeOptions = CONTACT_METHOD_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: `${option.emoji} ${option.value === "home" ? t("TypeHome") : t("TypeWork")}`,
  }));

  const [draftPhone, setDraftPhone] = useState<PhoneEntry>(createDraftPhone());
  const [draftEmail, setDraftEmail] = useState<EmailEntry>(createDraftEmail());
  const [localPhones, setLocalPhones] = useState<PhoneEntry[]>(phones);
  const [localEmails, setLocalEmails] = useState<EmailEntry[]>(emails);

  useEffect(() => {
    setLocalPhones(phones);
  }, [phones]);

  useEffect(() => {
    setLocalEmails(emails);
  }, [emails]);

  const isPhoneLimitReached = localPhones.length >= MAX_ENTRIES;
  const isEmailLimitReached = localEmails.length >= MAX_ENTRIES;

  const persistPhones = (nextPhones: PhoneEntry[]) => {
    setLocalPhones(nextPhones);
    onPhonesChange(nextPhones);
    onSave({ phones: nextPhones });
  };

  const persistEmails = (nextEmails: EmailEntry[]) => {
    setLocalEmails(nextEmails);
    onEmailsChange(nextEmails);
    onSave({ emails: nextEmails });
  };

  const saveCurrentPhones = () => {
    onPhonesChange(localPhones);
    onSave({ phones: localPhones });
  };

  const saveCurrentEmails = () => {
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
      <Text size="sm" fw={600} mb="md">
        {t("Title")}
      </Text>
      <Flex gap="xl" direction={{ base: "column", md: "row" }}>
        {/* Phones Column */}
        <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
          <Text size="sm" c="dimmed">
            {t("PhoneNumbers")}
          </Text>

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
                <ActionIcon
                  variant="light"
                  color={phone.preferred ? "orange" : "blue"}
                  component="a"
                  href={
                    phone.prefix && phone.value ? `tel:${phone.prefix}${phone.value}` : undefined
                  }
                  disabled={!phone.value}
                >
                  {phone.preferred ? <IconPhoneSpark size={18} /> : <IconPhone size={18} />}
                </ActionIcon>

                <PrefixSelect
                  value={phone.prefix || "+1"}
                  onChange={(prefix) => handlePhonePrefixChange(index, prefix)}
                  style={{ flex: "0 0 110px" }}
                />

                <Input
                  component={IMaskInput}
                  mask={getTelephoneReactMaskExpression(phone.prefix || "+1")}
                  unmask
                  placeholder={t("PhonePlaceholder")}
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
                />

                <Select
                  value={phone.type}
                  onChange={(val) => handlePhoneTypeChange(index, val as ContactType)}
                  data={contactTypeOptions}
                  style={{ flex: "0 0 110px" }}
                  size="sm"
                />

                <Menu withinPortal position="bottom-end">
                  <Menu.Target>
                    <ActionIcon ml="auto" variant="subtle" disabled={savingField === "phones"}>
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconStarFilled size={14} />}
                      disabled={phone.preferred}
                      onClick={() => handlePhonePreferredChange(index)}
                    >
                      {t("SetAsPreferred")}
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => handleRemovePhone(index)}
                    >
                      {t("DeleteAction")}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>
          ))}

          {!isPhoneLimitReached ? (
            <Card withBorder p="sm" radius="md">
              <Group gap="xs" align="center" wrap="nowrap">
                <Tooltip label={t("AddPhone")} withArrow>
                  <ActionIcon variant="light" color="green" aria-label={t("AddPhone")}>
                    <IconPlus size={18} />
                  </ActionIcon>
                </Tooltip>

                <PrefixSelect
                  value={draftPhone.prefix || "+1"}
                  onChange={(prefix) => setDraftPhone((previous) => ({ ...previous, prefix }))}
                  style={{ flex: "0 0 110px" }}
                />

                <Input
                  component={IMaskInput}
                  mask={getTelephoneReactMaskExpression(draftPhone.prefix || "+1")}
                  unmask
                  placeholder={t("PhonePlaceholder")}
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
                />

                <Select
                  value={draftPhone.type}
                  onChange={(value) =>
                    setDraftPhone((previous) => ({
                      ...previous,
                      type: (value as ContactType) || "home",
                    }))
                  }
                  data={contactTypeOptions}
                  style={{ flex: "0 0 110px" }}
                  size="sm"
                  disabled={savingField === "phones"}
                />
              </Group>
            </Card>
          ) : null}
        </Stack>

        {/* Emails Column */}
        <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
          <Text size="sm" c="dimmed">
            {t("EmailAddresses")}
          </Text>

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
                <ActionIcon
                  variant="light"
                  color={email.preferred ? "orange" : "red"}
                  component="a"
                  href={email.value ? `mailto:${email.value}` : undefined}
                  disabled={!email.value}
                >
                  {email.preferred ? <IconMailSpark size={18} /> : <IconMail size={18} />}
                </ActionIcon>

                <TextInput
                  placeholder={t("EmailPlaceholder")}
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
                />

                <Select
                  value={email.type}
                  onChange={(val) => handleEmailTypeChange(index, val as ContactType)}
                  data={contactTypeOptions}
                  style={{ flex: "0 0 110px" }}
                  size="sm"
                />

                <Menu withinPortal position="bottom-end">
                  <Menu.Target>
                    <ActionIcon ml="auto" variant="subtle" disabled={savingField === "emails"}>
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconStarFilled size={14} />}
                      disabled={email.preferred}
                      onClick={() => handleEmailPreferredChange(index)}
                    >
                      {t("SetAsPreferred")}
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => handleRemoveEmail(index)}
                    >
                      {t("DeleteAction")}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>
          ))}

          {!isEmailLimitReached ? (
            <Card withBorder p="sm" radius="md">
              <Group gap="xs" align="center" wrap="nowrap">
                <Tooltip label={t("AddEmail")} withArrow>
                  <ActionIcon variant="light" color="green" aria-label={t("AddEmail")}>
                    <IconPlus size={18} />
                  </ActionIcon>
                </Tooltip>

                <TextInput
                  placeholder={t("EmailPlaceholder")}
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
                />

                <Select
                  value={draftEmail.type}
                  onChange={(value) =>
                    setDraftEmail((previous) => ({
                      ...previous,
                      type: (value as ContactType) || "home",
                    }))
                  }
                  data={contactTypeOptions}
                  style={{ flex: "0 0 110px" }}
                  size="sm"
                  disabled={savingField === "emails"}
                />
              </Group>
            </Card>
          ) : null}
        </Stack>
      </Flex>
    </div>
  );
}
