import about from "@bondery/translations/locales/en/features/pages/AboutPage.json";
import { Box, Container, Grid, GridCol, Image, Stack, Text, Title } from "@mantine/core";
import { Team } from "@/components/landing/Team";

export function About() {
  return (
    <Container mt="xl" py="xl" size="lg">
      <Stack gap="xl">
        <Box>
          <Stack gap="md">
            <Title order={1} ta="center">
              {about.PeopleTitle}
            </Title>
            <Text c="dimmed" maw={760} mx="auto" size="lg" ta="center">
              {about.PeopleSubtitle}
            </Text>
          </Stack>
        </Box>

        <Box>
          <Grid align="center" gap="xl">
            <GridCol span={{ base: 12, md: 6 }}>
              <Image
                alt={about.FoundersPhotoAlt}
                fallbackSrc="/images/team/martin.jpg"
                fit="cover"
                h={360}
                radius="md"
                src="/images/team/medtech-hackathon.jpg"
              />
            </GridCol>
            <GridCol span={{ base: 12, md: 6 }}>
              <Stack gap="sm">
                <Title order={2}>How Bondery started</Title>
                <Text c="dimmed">{about.Story}</Text>
              </Stack>
            </GridCol>
          </Grid>
        </Box>

        <Team title={about.WorkingOnBonderyTitle} />
      </Stack>
    </Container>
  );
}
