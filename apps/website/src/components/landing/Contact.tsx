import { Container, Stack, Text, Title, Paper, Group, ThemeIcon } from "@mantine/core";
import { IconMail, IconBrandDiscord, IconBrandReddit } from "@tabler/icons-react";
import { AnchorLink } from "@bondery/mantine-next";
import { SOCIAL_LINKS, SUPPORT_EMAIL } from "@bondery/helpers";

const CONTACT_METHODS = [
  {
    text: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    icon: IconMail,
    color: "violet",
    target: undefined as string | undefined,
  },
  {
    text: "Chat with us on Discord",
    href: SOCIAL_LINKS.discord,
    icon: IconBrandDiscord,
    color: "indigo",
    target: "_blank" as const,
  },
  {
    text: "Post on our Reddit",
    href: SOCIAL_LINKS.reddit,
    icon: IconBrandReddit,
    color: "orange",
    target: "_blank" as const,
  },
];

export function Contact() {
  return (
    <Container size="md" className="my-20">
      <Stack align="center" gap="xl">
        <Stack align="center" gap="md">
          <Title order={1} ta="center" size="h1">
            Contact us
          </Title>
          <Text ta="center" size="lg" c="dimmed" maw={600}>
            Have questions or feedback? We're here to help or just chat!
          </Text>
        </Stack>

        <Paper
          shadow="sm"
          radius="lg"
          p="xl"
          withBorder
          w="100%"
          maw={500}
          className="card-scale-effect"
        >
          <Stack gap="lg">
            {CONTACT_METHODS.map((method) => (
              <Group key={method.text} gap="md">
                <ThemeIcon size={48} radius="md" variant="light" color={method.color}>
                  <method.icon size={24} />
                </ThemeIcon>
                <AnchorLink
                  href={method.href}
                  target={method.target}
                  size="lg"
                  fw={600}
                  c={"var(--mantine-color-text)"}
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
