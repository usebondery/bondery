import {
  ActionIcon,
  Box,
  Card,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
} from "@tabler/icons-react";
import { AnchorLink } from "@bondery/mantine-next";
import { en } from "@bondery/translations";
import { SOCIAL_LINKS } from "@bondery/helpers";
import { Team } from "@/components/landing/Team";

const about = en.AboutPage;

const COMMUNITY_LINKS = [
  {
    key: "Reddit",
    href: "https://www.reddit.com/r/bondery",
    icon: IconBrandReddit,
  },
  {
    key: "LinkedIn",
    href: SOCIAL_LINKS.linkedin,
    icon: IconBrandLinkedin,
  },
  {
    key: "GitHub",
    href: SOCIAL_LINKS.github,
    icon: IconBrandGithub,
  },
  {
    key: "X",
    href: "https://x.com/usebondery",
    icon: IconBrandX,
  },
] as const;

export function About() {
  return (
    <Container size="lg" py="xl" mt="xl">
      <Stack gap="xl">
        <Stack gap="md" align="center">
          <Title order={1} ta="center">
            {about.Title}
          </Title>
          <Text ta="center" c="dimmed" maw={760}>
            {about.Description}
          </Text>
        </Stack>

        <Card withBorder p="xl" radius="md" className="card-scale-effect">
          <Stack gap="lg">
            <Title order={2}>{about.WhyBonderyExists}</Title>
            <Image
              src="/images/team/medtech-hackathon.jpg"
              fallbackSrc="/images/team/martin.jpg"
              alt={about.FoundersPhotoAlt}
              radius="md"
              fit="cover"
              h={360}
            />
            <Text c="dimmed" size="lg">
              {about.Story}
            </Text>
          </Stack>
        </Card>

        <Box>
          <Team />
        </Box>

        <Card withBorder p="xl" radius="md">
          <Stack gap="md" align="center">
            <Title order={2}>{about.Communities}</Title>
            <Text c="dimmed" ta="center">
              {about.CommunityDescription}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" w="100%" mt="sm">
              {COMMUNITY_LINKS.map((community) => (
                <AnchorLink
                  key={community.key}
                  href={community.href}
                  target="_blank"
                  c="var(--mantine-color-text)"
                  underline="never"
                >
                  <Card withBorder p="md" radius="md" className="card-scale-effect">
                    <Group justify="space-between" align="center">
                      <Text fw={600}>{about.Links[community.key]}</Text>
                      <ActionIcon variant="light" size="lg" aria-label={about.Links[community.key]}>
                        <community.icon size={20} />
                      </ActionIcon>
                    </Group>
                  </Card>
                </AnchorLink>
              ))}
            </SimpleGrid>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
