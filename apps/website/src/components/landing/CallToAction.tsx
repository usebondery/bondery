import { ButtonLink } from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Card, Container, Stack, Title } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import { hrefWebappLogin } from "@/lib/navigation/href/webapp";

export function CallToAction() {
  return (
    <Container
      bg="var(--mantine-color-body)"
      fluid
      py={{
        base: "calc(var(--mantine-spacing-lg) * 4)",
        lg: "calc(var(--mantine-spacing-lg) * 6)",
        xs: "calc(var(--mantine-spacing-lg) * 5)",
      }}
    >
      <Card
        bg="var(--mantine-primary-color-filled)"
        display="flex"
        maw="72rem"
        mih={400}
        mx="auto"
        p="xl"
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <Stack align="center" flex={1} gap="3rem" h="100%" justify="center" maw="80%" p="xl">
          <Title c="white" display="inline" fw="bold" fz="1.875rem" order={2} ta="center">
            {landing.Cta.Title}
          </Title>
          <ButtonLink
            href={hrefWebappLogin()}
            radius="xl"
            rightSection={<IconArrowUpRight />}
            size="lg"
            variant="white"
          >
            {landing.Cta.Button}
          </ButtonLink>
        </Stack>
      </Card>
    </Container>
  );
}
