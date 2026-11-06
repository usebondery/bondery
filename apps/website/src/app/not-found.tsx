import "./marketing.css";
import { ButtonLink } from "@bondery/mantine-next";
import { Container, Stack, Text, Title } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import type { Metadata } from "next";
import { Footer, Header } from "@/components/landing";
import { MantineShell } from "@/components/mantine-shell";
import { PageTopSpacer } from "@/components/page-top-spacer";

export const metadata: Metadata = {
  description: "The page you are looking for does not exist.",
  robots: {
    follow: false,
    index: false,
  },
  title: "Page Not Found",
};

export default function Page() {
  return (
    <MantineShell>
      <Header />
      <main>
        <Container pb="xl" size="sm">
          <PageTopSpacer />
          <Stack align="center" gap="xl" justify="center" style={{ minHeight: "60vh" }}>
            <Stack align="center" gap="md">
              <Title order={1} ta="center">
                Page Not Found
              </Title>
              <Text c="dimmed" size="lg" ta="center">
                The page you are looking for does not exist.
              </Text>
            </Stack>
            <ButtonLink href="/" leftSection={<IconHome size={20} />} size="lg">
              Back to Home
            </ButtonLink>
          </Stack>
        </Container>
      </main>
      <Footer />
    </MantineShell>
  );
}
