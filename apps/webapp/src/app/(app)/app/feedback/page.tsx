import { Container, Title, Stack, Group, Text, Box } from "@mantine/core";
import { getTranslations } from "next-intl/server";
import { FeedbackForm } from "./components/FeedbackForm";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import { PageWrapper } from "../components/PageWrapper";

export default async function FeedbackPage() {
  const t = await getTranslations("FeedbackPage");

  return (
    <PageWrapper>
      <ErrorPageHeader iconType="message-circle" title={t("Title")} />
      <Stack align="center">
        <FeedbackForm />
      </Stack>
    </PageWrapper>
  );
}
