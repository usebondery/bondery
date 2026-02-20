import { Box, Container, Grid, GridCol, Image, Stack, Text, Title } from "@mantine/core";
import { en } from "@bondery/translations";
import { Team } from "@/components/landing/Team";

const about = en.AboutPage;

export function About() {
  return (
    <Container size="lg" py="xl" mt="xl">
      <Stack gap="xl">
        <Box>
          <Stack gap="md">
            <Title order={1} ta="center">
              {about.PeopleTitle}
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={760} mx="auto">
              {about.PeopleSubtitle}
            </Text>
          </Stack>
        </Box>

        <Box>
          <Grid gutter="xl" align="center">
            <GridCol span={{ base: 12, md: 6 }}>
              <Image
                src="/images/team/medtech-hackathon.jpg"
                fallbackSrc="/images/team/martin.jpg"
                alt={about.FoundersPhotoAlt}
                radius="md"
                fit="cover"
                h={360}
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
