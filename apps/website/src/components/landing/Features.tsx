import { Box, Container, Grid, GridCol, Stack, Text, Title } from "@mantine/core";
import { AnimatedPeople } from "./AnimatedPeople";
import { PrivacyCodeAnimation } from "./PrivacyCodeAnimation";
import { SyncedConnectionsAnimation } from "./SyncedConnectionsAnimation";
import { TimelineAnimation } from "./TimelineAnimation";

type FeatureSectionProps = {
  title: string;
  description: string;
  imagePosition: "left" | "right";
  imagePlaceholder: React.ReactNode;
};

const FeatureSection = ({
  title,
  description,
  imagePosition,
  imagePlaceholder,
}: FeatureSectionProps) => {
  const content = (
    <Stack gap="xl" h="100%" justify="center">
      <Box>
        <Title
          mb="md"
          order={2}
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 700,
          }}
        >
          {title}
        </Title>
        <Text c="dimmed" size="lg">
          {description}
        </Text>
      </Box>
    </Stack>
  );

  const image = (
    <Box
      style={{
        alignItems: "center",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        paddingTop: "var(--mantine-spacing-md)",
        width: "100%",
      }}
    >
      {imagePlaceholder}
    </Box>
  );

  return (
    <Box
      style={{
        alignItems: "center",
        backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
        display: "flex",
        minHeight: "100vh",
        overflowX: "clip",
      }}
    >
      <Container py={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 2)" }} size="xl">
        <Grid align="center" gap={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 3)" }}>
          {imagePosition === "left" ? (
            <>
              <GridCol order={{ base: 2, md: 1 }} span={{ base: 12, md: 6 }}>
                {image}
              </GridCol>
              <GridCol order={{ base: 1, md: 2 }} span={{ base: 12, md: 6 }}>
                {content}
              </GridCol>
            </>
          ) : (
            <>
              <GridCol span={{ base: 12, md: 6 }}>{content}</GridCol>
              <GridCol span={{ base: 12, md: 6 }}>{image}</GridCol>
            </>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

const _ImagePlaceholder = ({ color = "blue" }: { color?: string }) => (
  <Box
    style={{
      aspectRatio: "4/3",
      background: `linear-gradient(135deg, var(--mantine-color-${color}-4) 0%, var(--mantine-color-${color}-6) 100%)`,
      borderRadius: "var(--mantine-radius-lg)",
      boxShadow: "var(--mantine-shadow-xl)",
      maxWidth: 500,
      width: "100%",
    }}
  />
);

export function Features() {
  return (
    <Box id="features">
      <FeatureSection
        description="Bondery helps you build and maintain it: keeping track of the people you know and nudging you when too much time has passed. The best relationships are built on remembering the details. "
        imagePlaceholder={<AnimatedPeople />}
        imagePosition="right"
        title="Your network is one of your most valuable assets."
      />

      <FeatureSection
        description="Stop juggling notes, calendars and memory. Bondery is the one place for all your contacts, which automatically pulls in updates from LinkedIn so your data stays fresh without the manual work. Available on web, mobile, and via API."
        imagePlaceholder={<SyncedConnectionsAnimation />}
        imagePosition="left"
        title="The contact hub that updates itself"
      />

      <FeatureSection
        description="When was the last time you forgot something important about a person? With Bondery, keep all the details in one place and get reminded about them. From birthdays to follow-ups after conversations."
        imagePlaceholder={<TimelineAnimation />}
        imagePosition="right"
        title="Never forget what matters"
      />

      <FeatureSection
        description="Your contacts are precious and should not be shared for profit. Bondery is fully open-source and hosted on EU servers, with data that stays in Europe. Self-host with Docker Compose when you want full control."
        imagePlaceholder={<PrivacyCodeAnimation />}
        imagePosition="left"
        title="Open-source and privacy-first"
      />
    </Box>
  );
}
