"use client";

import { getTelephoneReactMaskExpression, parsePhoneNumber } from "@bondery/helpers/phone";
import { ActionIconLink, successNotificationTemplate, TypePicker } from "@bondery/mantine-next";
import {
  type ContactType,
  firstZodErrorMessage,
  type PhoneEntry,
  replacePhonesSchema,
} from "@bondery/schemas";
import { ActionIcon, Card, Group, Input, Loader, Menu, Stack, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconDotsVertical,
  IconMessage,
  IconPhone,
  IconPhoneSpark,
  IconPlus,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { IMaskInput } from "react-imask";
import type { ContactInfoLabels } from "@/lib/contacts/contact-info-labels";
import { createDraftPhone, MAX_PHONE_ENTRIES } from "../../utils/contactInfoUtils";
import { ContactInfoPrefixSelect } from "./ContactInfoPrefixSelect";

interface ContactPhonesSectionProps {
  labels: ContactInfoLabels;
  onPhonesChange: (phones: PhoneEntry[]) => void;
  onSave: (payload?: { phones?: PhoneEntry[] }) => void;
  phones: PhoneEntry[];
  phoneTypeOptions: Array<{ emoji: string; label: string; value: string }>;
  savingField: string | null;
  showSchemaNotification: (message?: string) => void;
}

export function ContactPhonesSection({
  phones,
  savingField,
  onPhonesChange,
  onSave,
  labels: text,
  phoneTypeOptions,
  showSchemaNotification,
}: ContactPhonesSectionProps) {
  const [draftPhone, setDraftPhone] = useState<PhoneEntry>(createDraftPhone());
  const [localPhones, setLocalPhones] = useState<PhoneEntry[]>(phones);

  useEffect(() => {
    setLocalPhones(phones);
  }, [phones]);

  const isPhoneLimitReached = localPhones.length >= MAX_PHONE_ENTRIES;

  const persistPhones = (nextPhones: PhoneEntry[]) => {
    const parsed = replacePhonesSchema.safeParse(nextPhones);
    if (!parsed.success) {
      showSchemaNotification(firstZodErrorMessage(parsed.error));
      return;
    }
    setLocalPhones(parsed.data);
    onPhonesChange(parsed.data);
    onSave({ phones: parsed.data });
  };

  const saveCurrentPhones = () => {
    const parsed = replacePhonesSchema.safeParse(localPhones);
    if (!parsed.success) {
      showSchemaNotification(firstZodErrorMessage(parsed.error));
      return;
    }
    onPhonesChange(parsed.data);
    onSave({ phones: parsed.data });
  };

  const handleCommitDraftPhone = () => {
    const nextValue = draftPhone.value.trim();
    if (!nextValue || isPhoneLimitReached) {
      return;
    }

    const nextPhone: PhoneEntry = {
      ...draftPhone,
      preferred: localPhones.length === 0,
      value: nextValue,
    };

    const nextPhones = [...localPhones, nextPhone];
    persistPhones(nextPhones);
    setDraftPhone(createDraftPhone());
  };

  const handleRemovePhone = (index: number) => {
    const newPhones = localPhones.filter((_, i) => i !== index);
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
      newPhones[index] = { ...newPhones[index], prefix: parsed.dialCode, value: parsed.number };
    } else {
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

  return (
    <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
      {localPhones.map((phone, index) => (
        <Card
          key={`${phone.prefix ?? ""}-${phone.value}`}
          p="sm"
          radius="md"
          style={{
            borderColor: phone.preferred ? "var(--mantine-color-orange-6)" : undefined,
            overflow: "visible",
            position: "relative",
          }}
          withBorder
        >
          <Group align="center" gap="xs" wrap="nowrap">
            <ActionIconLink
              ariaLabel={text.phoneNumbers}
              color={phone.preferred ? "orange" : "blue"}
              disabled={!phone.value}
              href={phone.prefix && phone.value ? `tel:${phone.prefix}${phone.value}` : undefined}
              icon={phone.preferred ? <IconPhoneSpark size={18} /> : <IconPhone size={18} />}
              variant="light"
            />

            <ContactInfoPrefixSelect
              ariaLabel={text.phonePrefixAriaLabel}
              onChange={(prefix) => handlePhonePrefixChange(index, prefix)}
              style={{ flex: "0 0 110px" }}
              value={phone.prefix || "+1"}
            />

            <Input
              aria-label={text.phonePlaceholder}
              component={IMaskInput}
              disabled={savingField === "phones"}
              mask={getTelephoneReactMaskExpression(phone.prefix || "+1")}
              onAccept={(value: string) => handlePhoneChange(index, value)}
              onBlur={saveCurrentPhones}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveCurrentPhones();
                }
              }}
              placeholder={text.phonePlaceholder}
              rightSection={savingField === "phones" ? <Loader size="xs" /> : null}
              size="sm"
              style={{ flex: "1 1 auto" }}
              unmask
              value={phone.value}
            />

            <TypePicker
              ariaLabel={text.typeLabel}
              data={phoneTypeOptions}
              onChange={(value) => handlePhoneTypeChange(index, value as ContactType)}
              size="sm"
              style={{ flex: "0 0 110px" }}
              value={phone.type}
            />

            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  aria-label={text.phoneActionsAriaLabel}
                  disabled={savingField === "phones"}
                  ml="auto"
                  variant="subtle"
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  disabled={!phone.value}
                  leftSection={<IconPhone size={14} />}
                  onClick={() => {
                    if (typeof window !== "undefined" && phone.value) {
                      window.location.href = `tel:${phone.prefix}${phone.value}`;
                    }
                  }}
                >
                  {text.callAction}
                </Menu.Item>
                <Menu.Item
                  disabled={!phone.value}
                  leftSection={<IconMessage size={14} />}
                  onClick={() => {
                    if (typeof window !== "undefined" && phone.value) {
                      window.location.href = `sms:${phone.prefix}${phone.value}`;
                    }
                  }}
                >
                  {text.sendSmsAction}
                </Menu.Item>
                <Menu.Item
                  disabled={!phone.value}
                  leftSection={<IconCopy size={14} />}
                  onClick={() => {
                    void navigator.clipboard.writeText(`${phone.prefix || ""}${phone.value || ""}`);
                    notifications.show(
                      successNotificationTemplate({
                        description: text.phoneCopiedMessage,
                        title: text.copySuccessTitle,
                      }),
                    );
                  }}
                >
                  {text.copyAction}
                </Menu.Item>
                <Menu.Item
                  disabled={phone.preferred}
                  leftSection={<IconStar size={14} />}
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
        <Card p="sm" radius="md" withBorder>
          <Group align="center" gap="xs" wrap="nowrap">
            <Tooltip label={text.addPhone} withArrow>
              <ActionIcon
                aria-label={text.addPhone}
                color="green"
                disabled={savingField === "phones"}
                onClick={handleCommitDraftPhone}
                variant="light"
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>

            <ContactInfoPrefixSelect
              ariaLabel={text.phonePrefixAriaLabel}
              onChange={(prefix) => setDraftPhone((previous) => ({ ...previous, prefix }))}
              style={{ flex: "0 0 110px" }}
              value={draftPhone.prefix || "+1"}
            />

            <Input
              aria-label={text.phonePlaceholder}
              component={IMaskInput}
              disabled={savingField === "phones"}
              mask={getTelephoneReactMaskExpression(draftPhone.prefix || "+1")}
              onAccept={(value: string) => handleDraftPhoneChange(value)}
              onBlur={handleCommitDraftPhone}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCommitDraftPhone();
                }
              }}
              placeholder={text.phonePlaceholder}
              size="sm"
              style={{ flex: "1 1 auto" }}
              unmask
              value={draftPhone.value}
            />

            <TypePicker
              ariaLabel={text.typeLabel}
              data={phoneTypeOptions}
              disabled={savingField === "phones"}
              onChange={(value) =>
                setDraftPhone((previous) => ({
                  ...previous,
                  type: (value as ContactType) || "home",
                }))
              }
              size="sm"
              style={{ flex: "0 0 110px" }}
              value={draftPhone.type}
            />
          </Group>
        </Card>
      ) : null}
    </Stack>
  );
}
