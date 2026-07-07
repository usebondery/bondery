"use client";

import { useMemo, useState } from "react";

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
import { createModalId, useModalBlocking } from "@/lib/modals";

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
  modalId: string;
}

function AddContactModalTitle() {
  const t = useTranslations("PeoplePage");
  return <ModalTitle text={t("AddContactModal.Title")} icon={<IconUserPlus size={24} />} />;
}

export function openAddContactModal(options: OpenAddContactModalOptions = {}) {
  const modalId = createModalId("add-contact");

  modals.open({
    modalId,
    title: <AddContactModalTitle />,
    trapFocus: true,
    children: <AddContactForm modalId={modalId} {...options} />,
  });
}

export function AddContactForm({
  modalId,
  onCreated,
  initialFullName = "",
  initialLinkedin = "",
}: AddContactFormProps) {
  const router = useRouter();
  const t = useTranslations("PeoplePage");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createContactMutation = useCreateContactMutation();

  useModalBlocking(modalId, isSubmitting);

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

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: t("AddContactModal.SuccessTitle"),
          description: t("AddContactModal.SuccessDescription"),
        }),
      );

      captureEvent("contact_created");

      modals.close(modalId);

      if (onCreated) {
        onCreated(createdContact);
        return;
      }

      router.refresh();
      router.push(`${WEBAPP_ROUTES.PERSON}/${createdContact.id}`);
    } catch (error) {
      notifications.hide(loadingNotification);

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
          onCancel={() => modals.close(modalId)}
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
