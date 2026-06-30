"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { Stack, TextInput, Text } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconBrandLinkedin, IconUserPlus } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { z } from "zod";
import { useCreateContactMutation } from "@/lib/query/hooks/useContacts";
import { getRandomExampleName } from "@bondery/helpers/name";
import { createContactFromFullNameSchema } from "@bondery/helpers/forms";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  createContactInputSchema,
  firstZodErrorMessage,
  type Contact,
} from "@bondery/schemas";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { captureEvent } from "@/lib/analytics/client";
import { extractUsername } from "@bondery/helpers";

const addContactFormSchema = z
  .object({
    fullName: createContactInputSchema.shape.fullName,
    linkedin: z.string(),
  })
  .superRefine((value, context) => {
    const result = createContactFromFullNameSchema.safeParse({ fullName: value.fullName });
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
      }
    }
  });

interface OpenAddContactModalOptions {
  onCreated?: (contact: Contact) => void;
  initialFullName?: string;
  initialLinkedin?: string;
}

interface AddContactFormProps extends OpenAddContactModalOptions {
  modalId?: string;
  /** When provided, used instead of the modals manager to close the modal (embedded mode). */
  onClose?: () => void;
}

function AddContactModalTitle() {
  const t = useTranslations("PeoplePage");
  return <ModalTitle text={t("AddContactModal.Title")} icon={<IconUserPlus size={24} />} />;
}

export function openAddContactModal(options: OpenAddContactModalOptions = {}) {
  const modalId = `add-contact-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    title: <AddContactModalTitle />,
    trapFocus: true,
    children: (
      <AddContactForm modalId={modalId} onClose={() => modals.close(modalId)} {...options} />
    ),
  });
}

export function AddContactForm({
  modalId,
  onClose,
  onCreated,
  initialFullName = "",
  initialLinkedin = "",
}: AddContactFormProps) {
  const router = useRouter();
  const t = useTranslations("PeoplePage");
  const safeModalId = modalId ?? "";
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createContactMutation = useCreateContactMutation();

  useEffect(() => {
    // In embedded mode (onClose prop provided), the parent <Modal> controls
    // these behaviours directly — no need to go through the modals manager.
    if (onClose) return;
    modals.updateModal({
      modalId: safeModalId,
      closeOnEscape: !isSubmitting,
      closeOnClickOutside: !isSubmitting,
      withCloseButton: !isSubmitting,
    });
  }, [isSubmitting, safeModalId, onClose]);

  const exampleName = useMemo(() => getRandomExampleName(), []);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      fullName: initialFullName,
      linkedin: initialLinkedin,
    },
    validate: schemaResolver(addContactFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    // Show loading notification
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("AddContactModal.LoadingTitle"),
        description: t("AddContactModal.LoadingDescription"),
      }),
    });

    try {
      const { firstName, middleName, lastName } = createContactFromFullNameSchema.parse({
        fullName: values.fullName.trim(),
      });
      const linkedinRaw = values.linkedin.trim();
      const linkedinHandle = linkedinRaw ? extractUsername("linkedin", linkedinRaw) : undefined;

      const createdContact = await createContactMutation.mutateAsync({
        firstName,
        ...(middleName ? { middleName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(linkedinHandle ? { linkedin: linkedinHandle } : {}),
      });

      // Hide loading notification
      notifications.hide(loadingNotification);

      // Show success notification
      notifications.show(
        successNotificationTemplate({
          title: t("AddContactModal.SuccessTitle"),
          description: t("AddContactModal.SuccessDescription"),
        }),
      );

      captureEvent("contact_created");

      if (onCreated) {
        if (onClose) {
          onClose();
        } else {
          modals.close(safeModalId);
        }
        onCreated(createdContact);
        return;
      }

      if (onClose) {
        onClose();
      } else {
        // Close modal and redirect to person page
        modals.close(safeModalId);
        router.push(`${WEBAPP_ROUTES.PERSON}/${createdContact.id}`);
      }
    } catch (error) {
      // Hide loading notification
      notifications.hide(loadingNotification);

      // Show error notification
      const fallbackMessage =
        error instanceof z.ZodError
          ? firstZodErrorMessage(error)
          : error instanceof Error
            ? error.message
            : t("AddContactModal.CreateFailed");
      notifications.show(
        errorNotificationTemplate({
          title: t("AddContactModal.ErrorTitle"),
          description: fallbackMessage,
        }),
      );

      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label={t("AddContactModal.FullNameInput")}
          placeholder={`${exampleName.firstName} ${exampleName.lastName}`}
          withAsterisk
          maxLength={CONTACT_FIELD_MAX_LENGTHS.fullName}
          key={form.key("fullName")}
          {...form.getInputProps("fullName")}
          disabled={isSubmitting}
          data-autofocus
          autoFocus
          onFocus={() => setFocusedField("fullName")}
          onBlur={() => setFocusedField(null)}
          rightSection={
            focusedField === "fullName" ? (
              <Text size="10px" c="dimmed">
                {form.values.fullName.length}/{CONTACT_FIELD_MAX_LENGTHS.fullName}
              </Text>
            ) : null
          }
        />

        <TextInput
          label={t("AddContactModal.LinkedInInput")}
          placeholder={t("AddContactModal.LinkedInPlaceholder")}
          maxLength={200}
          leftSection={<IconBrandLinkedin size={16} />}
          key={form.key("linkedin")}
          {...form.getInputProps("linkedin")}
          onFocus={() => setFocusedField("linkedin")}
          onBlur={(e) => {
            setFocusedField(null);
            // Extract handle from any URL format on blur
            const raw = e.currentTarget.value.trim();
            if (raw) {
              const extracted = extractUsername("linkedin", raw);
              form.setFieldValue("linkedin", extracted);
            }
          }}
          disabled={isSubmitting}
        />

        <ModalFooter
          cancelLabel={t("AddContactModal.Cancel")}
          onCancel={() => (onClose ? onClose() : modals.close(safeModalId))}
          cancelDisabled={isSubmitting}
          actionLabel={t("AddContactModal.AddToBondery")}
          actionType="submit"
          actionLoading={isSubmitting}
          actionDisabled={isSubmitting}
          actionLeftSection={!isSubmitting ? <IconUserPlus size={16} /> : undefined}
        />
      </Stack>
    </form>
  );
}
