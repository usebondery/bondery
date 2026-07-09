"use client";

import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  firstZodErrorMessage,
  updateAccountInputSchema,
} from "@bondery/schemas";
import { Group, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUser } from "@tabler/icons-react";
import { useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface NameFieldsProps {
  initialMiddlename: string;
  initialName: string;
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

  const t = useWebTranslations("SettingsPage", "Profile");
  const updateSettings = useUpdateSettingsMutation();

  const updateName = async (field: "name" | "middlename" | "surname", value: string) => {
    const currentValues = {
      middlename,
      name,
      surname,
    };

    const originalValues = {
      middlename: originalMiddlename,
      name: originalName,
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
          description: message,
          title: t("UpdateError"),
        }),
      );
      return;
    }

    if (field === "name") {
      setNameError("");
    }

    try {
      await updateSettings.mutateAsync(validationResult.data);

      if (field === "name") {
        setOriginalName(value);
      }
      if (field === "middlename") {
        setOriginalMiddlename(value);
      }
      if (field === "surname") {
        setOriginalSurname(value);
      }

      notifications.show(
        successNotificationTemplate({
          description: t("NameUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: t("NameUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  return (
    <Group align="flex-start" grow style={{ flex: 1 }}>
      <TextInput
        error={nameError}
        label={t("FirstName")}
        leftSection={<IconUser size={16} />}
        onBlur={(e) => {
          setNameFocused(false);
          updateName("name", e.currentTarget.value);
        }}
        onChange={(e) => setName(e.currentTarget.value)}
        onFocus={() => setNameFocused(true)}
        required
        rightSection={
          nameFocused ? (
            <Text c="dimmed" pr={"xs"} size="xs">
              {name.length}/{CONTACT_FIELD_MAX_LENGTHS.firstName}
            </Text>
          ) : undefined
        }
        value={name}
      />
      <TextInput
        label={t("MiddleNames")}
        leftSection={<IconUser size={16} />}
        onBlur={(e) => {
          setMiddlenameFocused(false);
          updateName("middlename", e.currentTarget.value);
        }}
        onChange={(e) => setMiddlename(e.currentTarget.value)}
        onFocus={() => setMiddlenameFocused(true)}
        rightSection={
          middlenameFocused ? (
            <Text c="dimmed" pr={"xs"} size="xs">
              {middlename.length}/{CONTACT_FIELD_MAX_LENGTHS.middleName}
            </Text>
          ) : undefined
        }
        value={middlename}
      />
      <TextInput
        label={t("Surname")}
        leftSection={<IconUser size={16} />}
        onBlur={(e) => {
          setSurnameFocused(false);
          updateName("surname", e.currentTarget.value);
        }}
        onChange={(e) => setSurname(e.currentTarget.value)}
        onFocus={() => setSurnameFocused(true)}
        rightSection={
          surnameFocused ? (
            <Text c="dimmed" pr={"xs"} size="xs">
              {surname.length}/{CONTACT_FIELD_MAX_LENGTHS.lastName}
            </Text>
          ) : undefined
        }
        value={surname}
      />
    </Group>
  );
}
