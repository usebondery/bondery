import { Box, Container, Grid, GridCol, Image, Stack, Text, Title } from "@mantine/core";
import NextImage from "next/image";
import { PrivacyCodeAnimation } from "./PrivacyCodeAnimation";
import { PersonEncryptionAnimation } from "./PersonEncryptionAnimation";
import { SyncedConnectionsAnimation } from "./SyncedConnectionsAnimation";
import { TimelineAnimation } from "./TimelineAnimation";
import { AnimatedPeople } from "./AnimatedPeople";

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
    <Stack gap="xl" justify="center" h="100%">
      <Box>
        <Title
          order={2}
          mb="md"
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 700,
          }}
        >
          {title}
        </Title>
        <Text size="lg" c="dimmed">
          {description}
        </Text>
      </Box>
    </Stack>
  );

  const image = (
    <Box
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "var(--mantine-spacing-md)",
      }}
    >
      {imagePlaceholder}
    </Box>
  );

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflowX: "clip",
        backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
      }}
    >
      <Container size="xl" py={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 2)" }}>
        <Grid gutter={{ base: "xl", md: "calc(var(--mantine-spacing-xl) * 3)" }} align="center">
          {imagePosition === "left" ? (
            <>
              <GridCol span={{ base: 12, md: 6 }} order={{ base: 2, md: 1 }}>
                {image}
              </GridCol>
              <GridCol span={{ base: 12, md: 6 }} order={{ base: 1, md: 2 }}>
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

const ImagePlaceholder = ({ color = "blue" }: { color?: string }) => (
  <Box
    style={{
      width: "100%",
      maxWidth: 500,
      aspectRatio: "4/3",
      borderRadius: "var(--mantine-radius-lg)",
      background: `linear-gradient(135deg, var(--mantine-color-${color}-4) 0%, var(--mantine-color-${color}-6) 100%)`,
      boxShadow: "var(--mantine-shadow-xl)",
    }}
  />
);

export function Features() {
  return (
    <Box id="features">
      <FeatureSection
        title="Your network is one of your most valuable assets."
        description="Bondery helps you build and maintain it: keeping track of the people you know and nudging you when too much time has passed. The best relationships are built on remembering the details. "
        imagePosition="right"
        imagePlaceholder={<AnimatedPeople />}
      />

      <FeatureSection
        title="The contact hub that updates itself"
        description="Stop juggling notes, calendars and memory. Bondery is the one place for all your contacts, which automatically pulls in updates from LinkedIn so your data stays fresh without the manual work. Available on web, mobile, and via API."
        imagePosition="left"
        imagePlaceholder={<SyncedConnectionsAnimation />}
      />

      <FeatureSection
        title="Never forget what matters"
        description="When was the last time you forgot something important about a person? With Bondery, keep all the details in one place and get reminded about them. From birthdays to follow-ups after conversations."
        imagePosition="right"
        imagePlaceholder={<TimelineAnimation />}
      />

      <FeatureSection
        title="Open-source and privacy-first"
        description="Your contacts are precious and should not be shared for profit. Bondery is fully open-source and hosted on EU servers, with data that stays in Europe. With self-hosting option coming soon."
        imagePosition="left"
        imagePlaceholder={<PrivacyCodeAnimation />}
      />
    </Box>
  );
}
