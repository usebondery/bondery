// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import { extractUsername } from "@bondery/helpers";
import { getUserFacingError } from "@bondery/helpers/api";
import { createContactFromFullNameSchema } from "@bondery/helpers/forms";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { getRandomExampleName } from "@bondery/helpers/name";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  type Contact,
  type ContactSelectable,
  createContactInputSchema,
  firstZodErrorMessage,
} from "@bondery/schemas";
import { Stack, Text, TextInput } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconBrandLinkedin, IconUserPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { z } from "zod";
import { captureEvent } from "@/lib/analytics/client";
import { useCommonTranslations, usePeoplePageTranslations } from "@/lib/i18n/generated/hooks";
import { optimisticPersonDocumentTitle } from "@/lib/metadata/optimisticTitles";
import { useNavigateWithTitle } from "@/lib/metadata/useNavigateWithTitle";
import {
  createModalId,
  rememberCreatedContactForModal,
  useCreateMore,
  useModalDismiss,
} from "@/lib/modals";
import { useCreateContactMutation } from "@/lib/query/hooks/useContacts";

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
          message: issue.message,
          path: issue.path,
        });
      }
    }
  });

interface OpenAddContactModalOptions {
  initialFullName?: string;
  initialLinkedin?: string;
  onClose?: () => void;
  onCreated?: (contact: Contact) => void;
  parentModalId?: string;
  repeatable?: boolean;
}

function toContactSelectable(contact: Contact): ContactSelectable {
  return {
    avatar: contact.avatar,
    firstName: contact.firstName,
    headline: contact.headline,
    id: contact.id,
    lastName: contact.lastName,
    location: contact.location,
    middleName: contact.middleName,
    myself: contact.myself,
  };
}

interface AddContactFormProps extends OpenAddContactModalOptions {
  modalId: string;
}

function AddContactModalTitle() {
  const t = usePeoplePageTranslations();
  return <ModalTitle icon={<IconUserPlus size={24} />} text={t("AddContactModal.Title")} />;
}

export function openAddContactModal(options: OpenAddContactModalOptions = {}) {
  const modalId = createModalId("add-contact");
  const { onClose, ...formOptions } = options;

  modals.open({
    children: <AddContactForm modalId={modalId} {...formOptions} />,
    modalId,
    onClose,
    size: "md",
    title: <AddContactModalTitle />,
    trapFocus: true,
  });
}

export function AddContactForm({
  modalId,
  onCreated,
  parentModalId,
  initialFullName = "",
  initialLinkedin = "",
  repeatable = true,
}: AddContactFormProps) {
  const { navigateWithTitle } = useNavigateWithTitle();
  const t = usePeoplePageTranslations();
  const tCommon = useCommonTranslations();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBlocking = isSubmitting;
  const createContactMutation = useCreateContactMutation();
  const { createMore, setCreateMore } = useCreateMore({ enabled: repeatable });
  const fullNameInputRef = useRef<HTMLInputElement>(null);

  const { closeModal } = useModalDismiss(modalId, isBlocking);

  const exampleName = getRandomExampleName();

  const form = useForm({
    initialValues: {
      fullName: initialFullName,
      linkedin: initialLinkedin,
    },
    mode: "controlled",
    validate: schemaResolver(addContactFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("AddContactModal.LoadingDescription"),
        title: t("AddContactModal.LoadingTitle"),
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
          description: t("AddContactModal.SuccessDescription"),
          title: t("AddContactModal.SuccessTitle"),
        }),
      );

      captureEvent("contacts:contact_create");

      if (repeatable && createMore) {
        form.setValues({ fullName: "", linkedin: "" });
        form.clearErrors();
        setIsSubmitting(false);
        queueMicrotask(() => fullNameInputRef.current?.focus());
        return;
      }

      if (parentModalId) {
        rememberCreatedContactForModal(parentModalId, toContactSelectable(createdContact));
      }

      if (onCreated || parentModalId) {
        onCreated?.(createdContact);
        closeModal();
        return;
      }

      closeModal();
      navigateWithTitle(
        `${WEBAPP_ROUTES.PERSON}/${createdContact.id}`,
        optimisticPersonDocumentTitle(createdContact),
      );
    } catch (error) {
      notifications.hide(loadingNotification);

      const fallbackMessage =
        error instanceof z.ZodError
          ? firstZodErrorMessage(error)
          : getUserFacingError(error, tCommon);
      notifications.show(
        errorNotificationTemplate({
          description: fallbackMessage,
          title: t("AddContactModal.ErrorTitle"),
        }),
      );

      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          key={form.key("fullName")}
          label={t("AddContactModal.FullNameInput")}
          maxLength={CONTACT_FIELD_MAX_LENGTHS.fullName}
          placeholder={`${exampleName.firstName} ${exampleName.lastName}`}
          withAsterisk
          {...form.getInputProps("fullName")}
          autoFocus
          data-autofocus
          disabled={isBlocking}
          onBlur={() => setFocusedField(null)}
          onFocus={() => setFocusedField("fullName")}
          ref={fullNameInputRef}
          rightSection={
            focusedField === "fullName" ? (
              <Text c="dimmed" size="10px">
                {form.values.fullName.length}/{CONTACT_FIELD_MAX_LENGTHS.fullName}
              </Text>
            ) : null
          }
        />

        <TextInput
          key={form.key("linkedin")}
          label={t("AddContactModal.LinkedInInput")}
          leftSection={<IconBrandLinkedin size={16} />}
          maxLength={200}
          placeholder={t("AddContactModal.LinkedInPlaceholder")}
          {...form.getInputProps("linkedin")}
          disabled={isBlocking}
          onBlur={(e) => {
            setFocusedField(null);
            const raw = e.currentTarget.value.trim();
            if (raw) {
              const extracted = extractUsername("linkedin", raw);
              form.setFieldValue("linkedin", extracted);
            }
          }}
          onFocus={() => setFocusedField("linkedin")}
        />

        <ModalFooter
          actionDisabled={isSubmitting}
          actionLabel={t("AddContactModal.AddToBondery")}
          actionLeftSection={!isSubmitting ? <IconUserPlus size={16} /> : undefined}
          actionLoading={isSubmitting}
          actionType="submit"
          cancelDisabled={isSubmitting}
          cancelLabel={t("AddContactModal.Cancel")}
          onCancel={closeModal}
          {...(repeatable
            ? {
                createMoreAriaDescription: tCommon("a11y.createMore"),
                createMoreChecked: createMore,
                createMoreDisabled: isBlocking,
                createMoreLabel: tCommon("actions.createMore"),
                onCreateMoreChange: setCreateMore,
              }
            : {})}
        />
      </Stack>
    </form>
  );
}
