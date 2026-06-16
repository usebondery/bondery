"use client";

import { Button, Slider, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { captureEvent } from "@/lib/analytics/client";
import type { useTranslations } from "next-intl";

interface FeedbackFormValues {
  npsScore: number;
  npsReason: string;
  generalFeedback: string;
}

const SLIDER_MARKS = [
  { value: 0, label: "0" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
];

interface FeedbackModalProps {
  modalId: string;
  t: ReturnType<typeof useTranslations<"FeedbackPage">>;
}

export function FeedbackModal({ modalId, t }: FeedbackModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormValues>({
    mode: "controlled",
    initialValues: {
      npsScore: 5,
      npsReason: "",
      generalFeedback: "",
    },
  });

  const handleSubmit = async (values: FeedbackFormValues) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("SubmittingTitle"),
        description: t("SubmittingMessage"),
      }),
    });

    try {
      const response = await fetch(API_ROUTES.ME_FEEDBACK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("SuccessMessage"),
        }),
      );

      captureEvent("nps_submitted", {
        score: values.npsScore,
        has_reason: values.npsReason.trim().length > 0,
        has_general_feedback: values.generalFeedback.trim().length > 0,
      });

      modals.close(modalId);
    } catch (error) {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("ErrorMessage"),
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
            min={0}
            max={10}
            step={1}
            size="xl"
            marks={SLIDER_MARKS}
            label={(value) => value.toString()}
            {...form.getInputProps("npsScore")}
            mb="md"
          />
        </Stack>

        <Textarea
          label={t("NpsReasonLabel", { score: form.values.npsScore })}
          placeholder={t("NpsReasonPlaceholder")}
          minRows={3}
          autosize
          {...form.getInputProps("npsReason")}
        />

        <Textarea
          label={t("GeneralFeedbackLabel")}
          placeholder={t("GeneralFeedbackPlaceholder")}
          minRows={3}
          autosize
          {...form.getInputProps("generalFeedback")}
        />

        <Button type="submit" loading={isSubmitting} fullWidth size="md">
          {t("SubmitButton")}
        </Button>
      </Stack>
    </form>
  );
}
