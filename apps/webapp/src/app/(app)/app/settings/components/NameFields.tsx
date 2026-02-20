"use client";

import { TextInput, Group, Text } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { useRouter } from "next/navigation";
import { INPUT_MAX_LENGTHS } from "@/lib/config";
import { revalidateSettings } from "../../actions";

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
  const router = useRouter();

  const updateName = async (field: "name" | "middlename" | "surname", value: string) => {
    if (field === "name" && value.trim().length === 0) {
      setNameError("First name is required");
      setName(originalName);
      return;
    }

    if (field === "name") {
      setNameError("");
    }

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

    try {
      const response = await fetch(API_ROUTES.SETTINGS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...currentValues,
          [field]: value,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update name");
      }

      if (field === "name") setOriginalName(value);
      if (field === "middlename") setOriginalMiddlename(value);
      if (field === "surname") setOriginalSurname(value);

      notifications.show({
        title: t("UpdateSuccess"),
        message: t("NameUpdateSuccess"),
        color: "green",
      });

      setTimeout(async () => {
        await revalidateSettings();
        router.refresh();
      }, 500);
    } catch {
      notifications.show({
        title: t("UpdateError"),
        message: t("NameUpdateError"),
        color: "red",
      });
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
              {name.length}/{INPUT_MAX_LENGTHS.firstName}
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
              {middlename.length}/{INPUT_MAX_LENGTHS.middleName}
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
              {surname.length}/{INPUT_MAX_LENGTHS.lastName}
            </Text>
          ) : undefined
        }
      />
    </Group>
  );
}
