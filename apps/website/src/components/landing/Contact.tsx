import { Container, Stack, Text, Title, Paper, Group, ThemeIcon } from "@mantine/core";
import { IconMail, IconBrandLinkedin, IconBrandGithub } from "@tabler/icons-react";
import { AnchorLink } from "@bondery/mantine-next";

const CONTACT_METHODS = [
  {
    text: "team@usebondery.com",
    href: "mailto:team@usebondery.com",
    icon: IconMail,
    color: "violet",
    target: undefined,
  },
  {
    text: "Follow us on LinkedIn",
    href: "https://www.linkedin.com/company/bondery",
    icon: IconBrandLinkedin,
    color: "blue",
    target: "_blank" as const,
  },
  {
    text: "Star us on GitHub",
    href: "https://github.com/usebondery/bondery",
    icon: IconBrandGithub,
    color: "dark",
    target: "_blank" as const,
  },
] as const;

export function Contact() {
  return (
    <Container size="md" className="my-20">
      <Stack align="center" gap="xl">
        <Stack align="center" gap="md">
          <Title order={1} ta="center" size="h1">
            Contact us
          </Title>
          <Text ta="center" size="lg" c="dimmed" maw={600}>
            Have questions or feedback? Reach out and we'll get back to you.
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
