"use client";

import { Button, Card, Slider, Stack, Text, Textarea } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useState } from "react";
import { captureEvent } from "@/lib/analytics/client";
import { submitFeedback } from "@/lib/api/domains/settings";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { feedbackFormSchema, type FeedbackFormInput } from "@bondery/schemas";

const SLIDER_MARKS = [
  { value: 0, label: "0" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
];

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("FeedbackPage");

  const form = useForm<FeedbackFormInput>({
    mode: "controlled",
    initialValues: {
      npsScore: 5,
      npsReason: "",
      generalFeedback: "",
    },
    validate: schemaResolver(feedbackFormSchema, { sync: true }),
  });

  const handleSubmit = async (values: FeedbackFormInput) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("SubmittingTitle"),
        description: t("SubmittingMessage"),
      }),
    });

    try {
      await submitFeedback(values);

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

      form.reset();
    } catch {
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
    <Card p="xl" className="max-w-xl" ta="left">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          <Stack gap="md">
            <Text fw={500}>{t("NpsLabel")}</Text>
            <Slider
              min={0}
              max={10}
              step={1}
              size={"xl"}
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
    </Card>
  );
}
