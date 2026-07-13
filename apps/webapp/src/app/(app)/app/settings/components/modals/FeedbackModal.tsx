"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { type FeedbackFormInput, feedbackFormSchema } from "@bondery/schemas";
import { Slider, Stack, Text, Textarea } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { captureEvent } from "@/lib/analytics/client";
import { submitFeedback } from "@/lib/api/domains/settings";
import { useFeedbackPageTranslations } from "@/lib/i18n/generated/hooks";
import { useModalDismiss } from "@/lib/modals";

const SLIDER_MARKS = [
  { label: "0", value: 0 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
];

interface FeedbackModalProps {
  modalId: string;
}

export function FeedbackModal({ modalId }: FeedbackModalProps) {
  const t = useFeedbackPageTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBlocking = isSubmitting;
  const { closeModal } = useModalDismiss(modalId, isBlocking);

  const form = useForm<FeedbackFormInput>({
    initialValues: {
      generalFeedback: "",
      npsReason: "",
      npsScore: 5,
    },
    mode: "controlled",
    validate: schemaResolver(feedbackFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: FeedbackFormInput) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("SubmittingMessage"),
        title: t("SubmittingTitle"),
      }),
    });

    try {
      await submitFeedback(values);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("SuccessMessage"),
          title: t("SuccessTitle"),
        }),
      );

      captureEvent("nps_submitted", {
        has_general_feedback: values.generalFeedback.trim().length > 0,
        has_reason: values.npsReason.trim().length > 0,
        score: values.npsScore,
      });

      closeModal();
    } catch {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("ErrorMessage"),
          title: t("ErrorTitle"),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="xl">
        <Stack gap="md">
          <Text fw={500}>{t("NpsLabel")}</Text>
          <Slider
            disabled={isBlocking}
            label={(value) => value.toString()}
            marks={SLIDER_MARKS}
            max={10}
            min={0}
            size="xl"
            step={1}
            {...form.getInputProps("npsScore")}
            mb="md"
          />
        </Stack>

        <Textarea
          autosize
          disabled={isBlocking}
          label={t("NpsReasonLabel", { score: form.values.npsScore })}
          minRows={3}
          placeholder={t("NpsReasonPlaceholder")}
          {...form.getInputProps("npsReason")}
        />

        <Textarea
          autosize
          disabled={isBlocking}
          label={t("GeneralFeedbackLabel")}
          minRows={3}
          placeholder={t("GeneralFeedbackPlaceholder")}
          {...form.getInputProps("generalFeedback")}
        />

        <ModalFooter
          actionDisabled={isSubmitting}
          actionLabel={t("SubmitButton")}
          actionLoading={isSubmitting}
          actionType="submit"
        />
      </Stack>
    </form>
  );
}
