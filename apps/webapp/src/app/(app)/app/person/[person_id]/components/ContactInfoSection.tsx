"use client";

import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconMail,
  IconPhone,
  IconPlus,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import type { PhoneEntry, EmailEntry, ContactType } from "@bondery/types";
import { countryCodes, parsePhoneNumber } from "@/lib/phoneHelpers";

const MAX_ENTRIES = 5;

interface ContactInfoSectionProps {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  savingField: string | null;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSave: () => void;
}

const contactTypeOptions: { value: ContactType; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
];

function PrefixSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = Array.from(
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

  const selected = countryCodes.find((c) => c.dialCode === value);

  return (
    <Select
      value={value}
      onChange={(val) => onChange(val || "+1")}
      data={options}
      renderOption={({ option }) => {
        const country = countryCodes.find((c) => c.dialCode === option.value);
        return (
          <Group gap="xs">
            <span className={`fi fi-${country?.flag || "us"}`} />
            <span>{option.value}</span>
          </Group>
        );
      }}
      leftSection={<span className={`fi fi-${selected?.flag || "us"}`} />}
      searchable
      style={{ width: 100 }}
      size="sm"
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
  const isPhoneLimitReached = phones.length >= MAX_ENTRIES;
  const isEmailLimitReached = emails.length >= MAX_ENTRIES;

  // Phone handlers
  const handleAddPhone = () => {
    if (isPhoneLimitReached) return;
    const newPhone: PhoneEntry = {
      prefix: "+1",
      value: "",
      type: "home",
      preferred: phones.length === 0, // First one is preferred by default
    };
    onPhonesChange([...phones, newPhone]);
  };

  const handleRemovePhone = (index: number) => {
    const newPhones = phones.filter((_, i) => i !== index);
    // If we removed the preferred one, make the first one preferred
    if (phones[index].preferred && newPhones.length > 0) {
      newPhones[0].preferred = true;
    }
    onPhonesChange(newPhones);
    onSave();
  };

  const handlePhoneChange = (index: number, value: string) => {
    const parsed = parsePhoneNumber(value);
    const newPhones = [...phones];

    if (parsed && value.includes("+")) {
      // User pasted a full number with prefix
      newPhones[index] = { ...newPhones[index], prefix: parsed.dialCode, value: parsed.number };
    } else {
      // User typed just the number part
      newPhones[index] = { ...newPhones[index], value };
    }
    onPhonesChange(newPhones);
  };

  const handlePhonePrefixChange = (index: number, prefix: string) => {
    const newPhones = [...phones];
    newPhones[index] = { ...newPhones[index], prefix };
    onPhonesChange(newPhones);
    onSave();
  };

  const handlePhoneTypeChange = (index: number, type: ContactType) => {
    const newPhones = [...phones];
    newPhones[index] = { ...newPhones[index], type };
    onPhonesChange(newPhones);
    onSave();
  };

  const handlePhonePreferredChange = (index: number) => {
    const newPhones = phones.map((phone, i) => ({
      ...phone,
      preferred: i === index,
    }));
    onPhonesChange(newPhones);
    onSave();
  };

  // Email handlers
  const handleAddEmail = () => {
    if (isEmailLimitReached) return;
    const newEmail: EmailEntry = {
      value: "",
      type: "home",
      preferred: emails.length === 0, // First one is preferred by default
    };
    onEmailsChange([...emails, newEmail]);
  };

  const handleRemoveEmail = (index: number) => {
    const newEmails = emails.filter((_, i) => i !== index);
    // If we removed the preferred one, make the first one preferred
    if (emails[index].preferred && newEmails.length > 0) {
      newEmails[0].preferred = true;
    }
    onEmailsChange(newEmails);
    onSave();
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = { ...newEmails[index], value };
    onEmailsChange(newEmails);
  };

  const handleEmailTypeChange = (index: number, type: ContactType) => {
    const newEmails = [...emails];
    newEmails[index] = { ...newEmails[index], type };
    onEmailsChange(newEmails);
    onSave();
  };

  const handleEmailPreferredChange = (index: number) => {
    const newEmails = emails.map((email, i) => ({
      ...email,
      preferred: i === index,
    }));
    onEmailsChange(newEmails);
    onSave();
  };

  return (
    <div>
      <Text size="sm" fw={600} mb="md">
        Contact Information
      </Text>
      <Flex gap="xl" direction={{ base: "column", md: "row" }}>
        {/* Phones Column */}
        <Stack gap="sm" style={{ flex: 1 }}>
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Phone Numbers
            </Text>
            <Tooltip
              label={
                isPhoneLimitReached
                  ? `Maximum of ${MAX_ENTRIES} phone numbers allowed`
                  : "Add phone number"
              }
              position="top"
            >
              <span>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={handleAddPhone}
                  disabled={isPhoneLimitReached}
                >
                  Add
                </Button>
              </span>
            </Tooltip>
          </Group>

          {phones.length === 0 && (
            <Text size="sm" c="dimmed" fs="italic">
              No phone numbers added
            </Text>
          )}

          {phones.map((phone, index) => (
            <Group key={index} gap="xs" align="flex-start" wrap="nowrap">
              <ActionIcon
                variant="light"
                color="blue"
                component="a"
                href={phone.prefix && phone.value ? `tel:${phone.prefix}${phone.value}` : undefined}
                disabled={!phone.value}
              >
                <IconPhone size={18} />
              </ActionIcon>

              <Tooltip label={phone.preferred ? "Preferred" : "Set as preferred"}>
                <ActionIcon
                  variant={phone.preferred ? "filled" : "subtle"}
                  color={phone.preferred ? "yellow" : "gray"}
                  onClick={() => handlePhonePreferredChange(index)}
                >
                  {phone.preferred ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                </ActionIcon>
              </Tooltip>

              <PrefixSelect
                value={phone.prefix || "+1"}
                onChange={(prefix) => handlePhonePrefixChange(index, prefix)}
              />

              <TextInput
                placeholder="Phone number"
                value={phone.value}
                onChange={(e) => handlePhoneChange(index, e.target.value)}
                onBlur={onSave}
                style={{ flex: 1 }}
                rightSection={savingField === "phones" ? <Loader size="xs" /> : null}
                disabled={savingField === "phones"}
              />

              <Select
                value={phone.type}
                onChange={(val) => handlePhoneTypeChange(index, val as ContactType)}
                data={contactTypeOptions}
                style={{ width: 100 }}
                size="sm"
              />

              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => handleRemovePhone(index)}
                disabled={savingField === "phones"}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>

        {/* Emails Column */}
        <Stack gap="sm" style={{ flex: 1 }}>
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Email Addresses
            </Text>
            <Tooltip
              label={
                isEmailLimitReached
                  ? `Maximum of ${MAX_ENTRIES} email addresses allowed`
                  : "Add email address"
              }
              position="top"
            >
              <span>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={handleAddEmail}
                  disabled={isEmailLimitReached}
                >
                  Add
                </Button>
              </span>
            </Tooltip>
          </Group>

          {emails.length === 0 && (
            <Text size="sm" c="dimmed" fs="italic">
              No email addresses added
            </Text>
          )}

          {emails.map((email, index) => (
            <Group key={index} gap="xs" align="flex-start" wrap="nowrap">
              <ActionIcon
                variant="light"
                color="red"
                component="a"
                href={email.value ? `mailto:${email.value}` : undefined}
                disabled={!email.value}
              >
                <IconMail size={18} />
              </ActionIcon>

              <Tooltip label={email.preferred ? "Preferred" : "Set as preferred"}>
                <ActionIcon
                  variant={email.preferred ? "filled" : "subtle"}
                  color={email.preferred ? "yellow" : "gray"}
                  onClick={() => handleEmailPreferredChange(index)}
                >
                  {email.preferred ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                </ActionIcon>
              </Tooltip>

              <TextInput
                placeholder="Email address"
                value={email.value}
                onChange={(e) => handleEmailChange(index, e.target.value)}
                onBlur={onSave}
                style={{ flex: 1 }}
                rightSection={savingField === "emails" ? <Loader size="xs" /> : null}
                disabled={savingField === "emails"}
              />

              <Select
                value={email.type}
                onChange={(val) => handleEmailTypeChange(index, val as ContactType)}
                data={contactTypeOptions}
                style={{ width: 100 }}
                size="sm"
              />

              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => handleRemoveEmail(index)}
                disabled={savingField === "emails"}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      </Flex>
    </div>
  );
}
