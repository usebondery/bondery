"use client";

import { TextInput, Group, Text } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  firstZodErrorMessage,
  updateAccountInputSchema,
} from "@bondery/schemas";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface NameFieldsProps {
  initialName: string;
  initialMiddlename: string;
  initialSurname: string;
}

export function NameFields({ initialName, initialMiddlename, initialSurname }: NameFieldsProps) {
  const [name, setName] = useState(initialName);
  const [middlename, setMiddlename] = useState(initialMiddlename);
  const [surname, setSurname] = useState(initialSurname);
  const [originalName, setOriginalName] = useState(initialName);
  const [originalMiddlename, setOriginalMiddlename] = useState(initialMiddlename);
  const [originalSurname, setOriginalSurname] = useState(initialSurname);
  const [nameError, setNameError] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [middlenameFocused, setMiddlenameFocused] = useState(false);
  const [surnameFocused, setSurnameFocused] = useState(false);

  const t = useTranslations("SettingsPage.Profile");
  const updateSettings = useUpdateSettingsMutation();

  const updateName = async (field: "name" | "middlename" | "surname", value: string) => {
    const currentValues = {
      name,
      middlename,
      surname,
    };

    const originalValues = {
      name: originalName,
      middlename: originalMiddlename,
      surname: originalSurname,
    };

    if (value === originalValues[field]) {
      return;
    }

    const nextValues = {
      ...currentValues,
      [field]: value,
    };

    const validationResult = updateAccountInputSchema.safeParse(nextValues);
    if (!validationResult.success) {
      const message = firstZodErrorMessage(validationResult.error);
      if (field === "name") {
        setNameError(message);
        setName(originalName);
      }
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: message,
        }),
      );
      return;
    }

    if (field === "name") {
      setNameError("");
    }

    try {
      await updateSettings.mutateAsync(validationResult.data);

      if (field === "name") setOriginalName(value);
      if (field === "middlename") setOriginalMiddlename(value);
      if (field === "surname") setOriginalSurname(value);

      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("NameUpdateSuccess"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("NameUpdateError"),
        }),
      );
    }
  };

  return (
    <Group grow align="flex-start" style={{ flex: 1 }}>
      <TextInput
        label={t("FirstName")}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onFocus={() => setNameFocused(true)}
        onBlur={(e) => {
          setNameFocused(false);
          updateName("name", e.currentTarget.value);
        }}
        leftSection={<IconUser size={16} />}
        rightSection={
          nameFocused ? (
            <Text size="xs" c="dimmed" pr={"xs"}>
              {name.length}/{CONTACT_FIELD_MAX_LENGTHS.firstName}
            </Text>
          ) : undefined
        }
        error={nameError}
        required
      />
      <TextInput
        label={t("MiddleNames")}
        value={middlename}
        onChange={(e) => setMiddlename(e.currentTarget.value)}
        onFocus={() => setMiddlenameFocused(true)}
        onBlur={(e) => {
          setMiddlenameFocused(false);
          updateName("middlename", e.currentTarget.value);
        }}
        leftSection={<IconUser size={16} />}
        rightSection={
          middlenameFocused ? (
            <Text size="xs" c="dimmed" pr={"xs"}>
              {middlename.length}/{CONTACT_FIELD_MAX_LENGTHS.middleName}
            </Text>
          ) : undefined
        }
      />
      <TextInput
        label={t("Surname")}
        value={surname}
        onChange={(e) => setSurname(e.currentTarget.value)}
        onFocus={() => setSurnameFocused(true)}
        onBlur={(e) => {
          setSurnameFocused(false);
          updateName("surname", e.currentTarget.value);
        }}
        leftSection={<IconUser size={16} />}
        rightSection={
          surnameFocused ? (
            <Text size="xs" c="dimmed" pr={"xs"}>
              {surname.length}/{CONTACT_FIELD_MAX_LENGTHS.lastName}
            </Text>
          ) : undefined
        }
      />
    </Group>
  );
}
