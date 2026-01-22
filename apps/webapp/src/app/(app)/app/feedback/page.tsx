import { Container, Title, Stack, Group, Text } from "@mantine/core";
import { IconMessageCircle } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { FeedbackForm } from "./components/FeedbackForm";
import { PageHeader } from "@/components/PageHeader";

export default async function FeedbackPage() {
  const t = await getTranslations("FeedbackPage");

  return (
    <Container size="md">
      <Stack gap="xl">
        <PageHeader icon={IconMessageCircle} title={t("Title")} />

        <FeedbackForm />
      </Stack>
    </Container>
  );
}
