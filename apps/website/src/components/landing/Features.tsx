import { Box, Container, Grid, GridCol, Image, Stack, Text, Title } from "@mantine/core";
import NextImage from "next/image";
import { PrivacyCodeAnimation } from "./PrivacyCodeAnimation";
import { PersonEncryptionAnimation } from "./PersonEncryptionAnimation";
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
        title="Designed for human connections, not sales leads"
        description="Your personal connections deserve better than a sales bloated CRM. Bondery is built specifically for maintaining authentic relationships. Simple, intuitive interface with no complicated pipelines or sales jargon."
        imagePosition="right"
        imagePlaceholder={<PersonEncryptionAnimation />}
      />

      <FeatureSection
        title="The contact hub that updates itself"
        description="Stop juggling notes, apps, and memory. Bondery is the one place to store and manage your contacts across your entire workflow. It automatically fetches updates from LinkedIn and other sources, so you can stop maintaining data by hand. Open it on web, use it on mobile, or plug it into your custom app via API."
        imagePosition="left"
        imagePlaceholder={<SyncedConnectionsAnimation />}
      />

      <FeatureSection
        title="Never forget what matters"
        description="When was the last time you forgot something important about a person? With Bondery, keep all the details in one place and get reminded when it matters. From birthdays and gift ideas to how you met and family info. Your memory, on steroids."
        imagePosition="right"
        imagePlaceholder={<TimelineAnimation />}
      />

      <FeatureSection
        title="Open-source and privacy-first"
        description="Your contacts are precious and should not be shared for profit. Bondery is fully open-source and hosted on EU servers, with data that stays in Europe. Self-hosting option coming soon. You own your data, always."
        imagePosition="left"
        imagePlaceholder={<PrivacyCodeAnimation />}
      />
    </Box>
  );
}
