"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Stack, TextInput, Button, Group, Text, Alert } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconUserPlus } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { SocialMediaInput, validateSocialMediaInput } from "./SocialMediaInput";
import { INPUT_MAX_LENGTHS } from "@/lib/config";
import { getRandomExampleName } from "@/lib/randomNameHelpers";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

export function openAddContactModal() {
  modals.open({
    title: <ModalTitle text="Add new person" icon={<IconUserPlus size={24} />} />,
    trapFocus: true,
    children: <AddContactForm />,
  });
}

function AddContactForm() {
  const router = useRouter();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const exampleName = useMemo(() => getRandomExampleName(), []);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      linkedin: "",
    },
    validate: {
      firstName: (value) =>
        value.trim().length === 0
          ? "Please add a first name"
          : value.length > INPUT_MAX_LENGTHS.firstName
            ? `First name must be ${INPUT_MAX_LENGTHS.firstName} characters or less`
            : null,
      middleName: (value) =>
        value.length > INPUT_MAX_LENGTHS.middleName
          ? `Middle name must be ${INPUT_MAX_LENGTHS.middleName} characters or less`
          : null,
      lastName: (value) =>
        value.trim().length === 0
          ? "Please add a last name"
          : value.length > INPUT_MAX_LENGTHS.lastName
            ? `Last name must be ${INPUT_MAX_LENGTHS.lastName} characters or less`
            : null,
      linkedin: (value) => {
        if (value.length > 50) {
          return "LinkedIn must be 50 characters or less";
        }
        return validateSocialMediaInput(value, "linkedin");
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    // Show loading notification
    const loadingNotification = notifications.show({
      title: "Creating contact...",
      message: "Please wait while we create the new contact",
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const res = await fetch(API_ROUTES.CONTACTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          middleName: values.middleName.trim() || undefined,
          lastName: values.lastName.trim(),
          linkedin: values.linkedin.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create contact");
      }

      const data = await res.json();
      const newContactId = data.id;

      // Hide loading notification
      notifications.hide(loadingNotification);

      // Show success notification
      notifications.show({
        title: "Success",
        message: "Contact created successfully",
        color: "green",
      });

      // Close modal
      modals.closeAll();

      // Redirect to person page
      router.push(`${WEBAPP_ROUTES.PERSON}/${newContactId}`);
    } catch (error) {
      // Hide loading notification
      notifications.hide(loadingNotification);

      // Show error notification
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create contact. Please try again.",
        color: "red",
      });

      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label="First name"
          placeholder={exampleName.firstName}
          withAsterisk
          maxLength={INPUT_MAX_LENGTHS.firstName}
          key={form.key("firstName")}
          {...form.getInputProps("firstName")}
          disabled={isSubmitting}
          data-autofocus
          autoFocus
          onFocus={() => setFocusedField("firstName")}
          onBlur={() => setFocusedField(null)}
          rightSection={
            focusedField === "firstName" ? (
              <Text size="10px" c="dimmed">
                {form.values.firstName.length}/{INPUT_MAX_LENGTHS.firstName}
              </Text>
            ) : null
          }
        />

        <TextInput
          label="Middle names"
          placeholder={exampleName.middleName}
          maxLength={INPUT_MAX_LENGTHS.middleName}
          key={form.key("middleName")}
          {...form.getInputProps("middleName")}
          onFocus={() => setFocusedField("middleName")}
          onBlur={() => setFocusedField(null)}
          disabled={isSubmitting}
          rightSection={
            focusedField === "middleName" ? (
              <Text size="10px" c="dimmed">
                {form.values.middleName.length}/{INPUT_MAX_LENGTHS.middleName}
              </Text>
            ) : null
          }
        />

        <TextInput
          label="Last name"
          placeholder={exampleName.lastName}
          withAsterisk
          maxLength={INPUT_MAX_LENGTHS.lastName}
          key={form.key("lastName")}
          {...form.getInputProps("lastName")}
          onFocus={() => setFocusedField("lastName")}
          onBlur={() => setFocusedField(null)}
          disabled={isSubmitting}
          rightSection={
            focusedField === "lastName" ? (
              <Text size="10px" c="dimmed">
                {form.values.lastName.length}/{INPUT_MAX_LENGTHS.lastName}
              </Text>
            ) : null
          }
        />

        <SocialMediaInput
          platform="linkedin"
          value={form.values.linkedin}
          onChange={(value) => form.setFieldValue("linkedin", value)}
          error={form.errors.linkedin}
          displayLabel
          disabled={isSubmitting}
        />
        <Alert variant="info" icon={<IconInfoCircle />} title="Want to add more info?">
          You can add more details like phone, email, and other social media after creating the
          contact.
        </Alert>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => modals.closeAll()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            leftSection={!isSubmitting && <IconUserPlus size={16} />}
          >
            Add {form.getValues().firstName} to Bondery
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
