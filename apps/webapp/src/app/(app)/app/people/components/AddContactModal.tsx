"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Stack, TextInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUserPlus } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { INPUT_MAX_LENGTHS } from "@/lib/config";
import { getRandomExampleName } from "@/lib/randomNameHelpers";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateContacts } from "../../actions";

export function openAddContactModal() {
  const modalId = `add-contact-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    title: <ModalTitle text="Add new person" icon={<IconUserPlus size={24} />} />,
    trapFocus: true,
    children: <AddContactForm modalId={modalId} />,
  });
}

function AddContactForm({ modalId }: { modalId: string }) {
  const router = useRouter();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    modals.updateModal({
      modalId,
      closeOnEscape: !isSubmitting,
      closeOnClickOutside: !isSubmitting,
      withCloseButton: !isSubmitting,
    });
  }, [isSubmitting, modalId]);

  const exampleName = useMemo(() => getRandomExampleName(), []);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      firstName: "",
      middleName: "",
      lastName: "",
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
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    // Show loading notification
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: "Creating contact...",
        description: "Please wait while we create the new contact",
      }),
    });

    try {
      const res = await fetch(API_ROUTES.CONTACTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          middleName: values.middleName.trim() || undefined,
          lastName: values.lastName.trim(),
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
      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Contact created successfully",
        }),
      );

      // Close modal
      modals.close(modalId);

      // Redirect to person page
      await revalidateContacts();
      router.push(`${WEBAPP_ROUTES.PERSON}/${newContactId}`);
    } catch (error) {
      // Hide loading notification
      notifications.hide(loadingNotification);

      // Show error notification
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to create contact. Please try again.",
        }),
      );

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

        <ModalFooter
          cancelLabel="Cancel"
          onCancel={() => modals.close(modalId)}
          cancelDisabled={isSubmitting}
          actionLabel={`Add ${form.getValues().firstName} to Bondery`}
          actionType="submit"
          actionLoading={isSubmitting}
          actionDisabled={isSubmitting}
          actionLeftSection={!isSubmitting ? <IconUserPlus size={16} /> : undefined}
        />
      </Stack>
    </form>
  );
}
