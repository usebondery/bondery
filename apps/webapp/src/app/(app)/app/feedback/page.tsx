import { Container, Title, Stack, Group, Text } from "@mantine/core";
import { IconMessageCircle } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { FeedbackForm } from "./components/FeedbackForm";

export default async function FeedbackPage() {
  const t = await getTranslations("FeedbackPage");

  return (
    <Container size="md">
      <Stack gap="xl">
        <Group gap="sm">
          <IconMessageCircle size={32} stroke={1.5} />
          <div>
            <Title order={1}>{t("Title")}</Title>
            <Text c="dimmed" size="sm">
              {t("Description")}
            </Text>
          </div>
        </Group>

        <FeedbackForm />
      </Stack>
    </Container>
  );
}
