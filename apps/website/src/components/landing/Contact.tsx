import { SOCIAL_LINKS, SUPPORT_EMAIL } from "@bondery/helpers";
import { AnchorLink } from "@bondery/mantine-next";
import { Container, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconBrandDiscord, IconBrandReddit, IconMail } from "@tabler/icons-react";

const CONTACT_METHODS = [
  {
    color: "violet",
    href: `mailto:${SUPPORT_EMAIL}`,
    icon: IconMail,
    target: undefined as string | undefined,
    text: SUPPORT_EMAIL,
  },
  {
    color: "indigo",
    href: SOCIAL_LINKS.discord,
    icon: IconBrandDiscord,
    target: "_blank" as const,
    text: "Chat with us on Discord",
  },
  {
    color: "orange",
    href: SOCIAL_LINKS.reddit,
    icon: IconBrandReddit,
    target: "_blank" as const,
    text: "Post on our Reddit",
  },
];

export function Contact() {
  return (
    <Container className="my-20" size="md">
      <Stack align="center" gap="xl">
        <Stack align="center" gap="md">
          <Title order={1} size="h1" ta="center">
            Contact us
          </Title>
          <Text c="dimmed" maw={600} size="lg" ta="center">
            Have questions or feedback? We're here to help or just chat!
          </Text>
        </Stack>

        <Paper
          className="card-scale-effect"
          maw={500}
          p="xl"
          radius="lg"
          shadow="sm"
          w="100%"
          withBorder
        >
          <Stack gap="lg">
            {CONTACT_METHODS.map((method) => (
              <Group gap="md" key={method.text}>
                <ThemeIcon color={method.color} radius="md" size={48} variant="light">
                  <method.icon size={24} />
                </ThemeIcon>
                <AnchorLink
                  c={"var(--mantine-color-text)"}
                  fw={600}
                  href={method.href}
                  size="lg"
                  target={method.target}
                >
                  {method.text}
                </AnchorLink>
              </Group>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
