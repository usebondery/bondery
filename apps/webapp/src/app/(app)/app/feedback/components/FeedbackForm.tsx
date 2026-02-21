"use client";

import { Button, Card, Slider, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";

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

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("FeedbackPage");

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
      const response = await fetch(API_ROUTES.FEEDBACK, {
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

      // Reset form after successful submission
      form.reset();
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
    <Card p="xl" className="max-w-xl" ta="left">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* NPS Score Slider */}
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

          {/* NPS Reason Textarea */}
          <Textarea
            label={t("NpsReasonLabel", { score: form.values.npsScore })}
            placeholder={t("NpsReasonPlaceholder")}
            minRows={3}
            autosize
            {...form.getInputProps("npsReason")}
          />

          {/* General Feedback Textarea */}
          <Textarea
            label={t("GeneralFeedbackLabel")}
            placeholder={t("GeneralFeedbackPlaceholder")}
            minRows={3}
            autosize
            {...form.getInputProps("generalFeedback")}
          />

          {/* Submit Button */}
          <Button type="submit" loading={isSubmitting} fullWidth size="md">
            {t("SubmitButton")}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
