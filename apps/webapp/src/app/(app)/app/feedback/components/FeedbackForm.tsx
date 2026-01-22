"use client";

import { Button, Card, Slider, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface FeedbackFormValues {
  npsScore: number;
  npsReason: string;
  generalFeedback: string;
}

const SLIDER_MARKS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
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
      title: t("SubmittingTitle"),
      message: t("SubmittingMessage"),
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const response = await fetch("/api/feedback", {
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
      notifications.show({
        title: t("SuccessTitle"),
        message: t("SuccessMessage"),
        color: "green",
      });

      // Reset form after successful submission
      form.reset();
    } catch (error) {
      notifications.hide(loadingNotification);
      notifications.show({
        title: t("ErrorTitle"),
        message: t("ErrorMessage"),
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card p="xl" className="max-w-2/3">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* NPS Score Slider */}
          <Stack gap="md">
            <Text fw={500}>{t("NpsLabel")}</Text>
            <Slider
              min={1}
              max={10}
              step={1}
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
