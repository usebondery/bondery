"use client";

import {
  ActionIconLink,
  errorNotificationTemplate,
  successNotificationTemplate,
  TypePicker,
} from "@bondery/mantine-next";
import {
  type ContactType,
  type EmailEntry,
  firstZodErrorMessage,
  replaceEmailsSchema,
} from "@bondery/schemas";
import { ActionIcon, Card, Group, Loader, Menu, Stack, TextInput, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconDotsVertical,
  IconMail,
  IconMailSpark,
  IconPlus,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { ContactInfoLabels } from "@/lib/contacts/contact-info-labels";
import { createDraftEmail, MAX_EMAIL_ENTRIES } from "../../utils/contactInfoUtils";

interface ContactEmailsSectionProps {
  emails: EmailEntry[];
  emailTypeOptions: Array<{ emoji: string; label: string; value: string }>;
  labels: ContactInfoLabels;
  onEmailsChange: (emails: EmailEntry[]) => void;
  onSave: (payload?: { emails?: EmailEntry[] }) => void;
  savingField: string | null;
  showSchemaNotification: (message?: string) => void;
}

export function ContactEmailsSection({
  emails,
  savingField,
  onEmailsChange,
  onSave,
  labels: text,
  emailTypeOptions,
  showSchemaNotification,
}: ContactEmailsSectionProps) {
  const [draftEmail, setDraftEmail] = useState<EmailEntry>(createDraftEmail());
  const [localEmails, setLocalEmails] = useState<EmailEntry[]>(emails);

  useEffect(() => {
    setLocalEmails(emails);
  }, [emails]);

  const isEmailLimitReached = localEmails.length >= MAX_EMAIL_ENTRIES;

  const showInvalidEmailNotification = () => {
    notifications.show(
      errorNotificationTemplate({
        description: text.invalidEmailMessage,
        title: text.invalidEmailTitle,
      }),
    );
  };

  const persistEmails = (nextEmails: EmailEntry[]) => {
    const parsed = replaceEmailsSchema.safeParse(nextEmails);
    if (!parsed.success) {
      showSchemaNotification(firstZodErrorMessage(parsed.error));
      return;
    }

    setLocalEmails(parsed.data);
    onEmailsChange(parsed.data);
    onSave({ emails: parsed.data });
  };

  const saveCurrentEmails = () => {
    const parsed = replaceEmailsSchema.safeParse(localEmails);
    if (!parsed.success) {
      showSchemaNotification(firstZodErrorMessage(parsed.error));
      return;
    }

    onEmailsChange(parsed.data);
    onSave({ emails: parsed.data });
  };

  const handleCommitDraftEmail = () => {
    const nextValue = draftEmail.value.trim();
    if (!nextValue || isEmailLimitReached) {
      return;
    }

    if (
      !replaceEmailsSchema.safeParse([
        ...localEmails,
        { ...draftEmail, preferred: localEmails.length === 0, value: nextValue },
      ]).success
    ) {
      showInvalidEmailNotification();
      return;
    }

    const nextEmail: EmailEntry = {
      ...draftEmail,
      preferred: localEmails.length === 0,
      value: nextValue,
    };

    const nextEmails = [...localEmails, nextEmail];
    persistEmails(nextEmails);
    setDraftEmail(createDraftEmail());
  };

  const handleRemoveEmail = (index: number) => {
    const newEmails = localEmails.filter((_, i) => i !== index);
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
    <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
      {localEmails.map((email, index) => (
        <Card
          key={email.value}
          p="sm"
          radius="md"
          style={{
            borderColor: email.preferred ? "var(--mantine-color-orange-6)" : undefined,
            overflow: "visible",
            position: "relative",
          }}
          withBorder
        >
          <Group align="center" gap="xs" wrap="nowrap">
            <ActionIconLink
              ariaLabel={text.emailAddresses}
              color={email.preferred ? "orange" : "red"}
              disabled={!email.value}
              href={email.value ? `mailto:${email.value}` : undefined}
              icon={email.preferred ? <IconMailSpark size={18} /> : <IconMail size={18} />}
              variant="light"
            />

            <TextInput
              aria-label={text.emailPlaceholder}
              disabled={savingField === "emails"}
              onBlur={saveCurrentEmails}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveCurrentEmails();
                }
              }}
              placeholder={text.emailPlaceholder}
              rightSection={savingField === "emails" ? <Loader size="xs" /> : null}
              size="sm"
              style={{ flex: 1 }}
              value={email.value}
            />

            <TypePicker
              ariaLabel={text.typeLabel}
              data={emailTypeOptions}
              onChange={(value) => handleEmailTypeChange(index, value as ContactType)}
              size="sm"
              style={{ flex: "0 0 110px" }}
              value={email.type}
            />

            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  aria-label={text.emailActionsAriaLabel}
                  disabled={savingField === "emails"}
                  ml="auto"
                  variant="subtle"
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  disabled={!email.value}
                  leftSection={<IconMail size={14} />}
                  onClick={() => {
                    if (typeof window !== "undefined" && email.value) {
                      window.location.href = `mailto:${email.value}`;
                    }
                  }}
                >
                  {text.sendEmailAction}
                </Menu.Item>
                <Menu.Item
                  disabled={!email.value}
                  leftSection={<IconCopy size={14} />}
                  onClick={() => {
                    void navigator.clipboard.writeText(email.value || "");
                    notifications.show(
                      successNotificationTemplate({
                        description: text.emailCopiedMessage,
                        title: text.copySuccessTitle,
                      }),
                    );
                  }}
                >
                  {text.copyAction}
                </Menu.Item>
                <Menu.Item
                  disabled={email.preferred}
                  leftSection={<IconStar size={14} />}
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
        <Card p="sm" radius="md" withBorder>
          <Group align="center" gap="xs" wrap="nowrap">
            <Tooltip label={text.addEmail} withArrow>
              <ActionIcon
                aria-label={text.addEmail}
                color="green"
                disabled={savingField === "emails"}
                onClick={handleCommitDraftEmail}
                variant="light"
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>

            <TextInput
              aria-label={text.emailPlaceholder}
              disabled={savingField === "emails"}
              onBlur={handleCommitDraftEmail}
              onChange={(event) =>
                setDraftEmail((previous) => ({ ...previous, value: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCommitDraftEmail();
                }
              }}
              placeholder={text.emailPlaceholder}
              size="sm"
              style={{ flex: 1 }}
              value={draftEmail.value}
            />

            <TypePicker
              ariaLabel={text.typeLabel}
              data={emailTypeOptions}
              disabled={savingField === "emails"}
              onChange={(value) =>
                setDraftEmail((previous) => ({
                  ...previous,
                  type: (value as ContactType) || "home",
                }))
              }
              size="sm"
              style={{ flex: "0 0 110px" }}
              value={draftEmail.type}
            />
          </Group>
        </Card>
      ) : null}
    </Stack>
  );
}
