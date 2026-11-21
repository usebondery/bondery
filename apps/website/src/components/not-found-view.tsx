import { ButtonLink } from "@bondery/mantine-next";
import notFound from "@bondery/translations/locales/en/platform/website/WebsiteNotFound.json" with {
  type: "json",
};
import { Container, Stack, Text, Title } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import type { Metadata } from "next";
import { PageTopSpacer } from "@/components/page-top-spacer";

/** Metadata shared by every 404 page: the page is not indexed and carries no canonical URL. */
export const notFoundMetadata: Metadata = {
  description: notFound.Description,
  robots: {
    follow: false,
    index: false,
  },
  title: notFound.Title,
};

export function NotFoundView() {
  return (
    <Container pb="xl" size="sm">
      <PageTopSpacer />
      <Stack align="center" gap="xl" justify="center" style={{ minHeight: "60vh" }}>
        <Stack align="center" gap="md">
          <Title order={1} ta="center">
            {notFound.Title}
          </Title>
          <Text c="dimmed" size="lg" ta="center">
            {notFound.Description}
          </Text>
        </Stack>
        <ButtonLink href="/" leftSection={<IconHome size={20} />} size="lg">
          {notFound.BackToHome}
        </ButtonLink>
      </Stack>
    </Container>
  );
}
