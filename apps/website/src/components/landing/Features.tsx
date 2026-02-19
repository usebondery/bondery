import { Box, Container, Grid, GridCol, Image, Stack, Text, Title } from "@mantine/core";
import NextImage from "next/image";

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
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
        backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
      }}
    >
      <Container size="xl" py="xl">
        <Grid gutter="calc(var(--mantine-spacing-xl) * 3)" align="center">
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
        title="Effortlessly sync your connections"
        description="Stop keeping all the information in your brain. Or manually typing them into phone notes. Bondery connects to LinkedIn and other sources to automatically keep your contacts up-to-date. Have more time for your relationships."
        imagePosition="right"
        imagePlaceholder={
          <Image
            component={NextImage}
            src="/images/hero/integrations.png"
            alt="Integrations overview"
            width={1200}
            height={900}
            sizes="(max-width: 768px) 100vw, 500px"
            radius={"lg"}
            style={{
              width: "100%",
              maxWidth: 500,
              height: "auto",
              aspectRatio: "4/3",
              objectFit: "contain",
            }}
          />
        }
      />

      <FeatureSection
        title="Designed for human connections, not sales leads"
        description="Your personal connections deserve better than a sales bloated CRM. Bondery is built specifically for maintaining authentic relationships. Simple, intuitive interface with no complicated pipelines or sales jargon. Just you and your network, connected."
        imagePosition="left"
        imagePlaceholder={<ImagePlaceholder color="pink" />}
      />

      <FeatureSection
        title="Never forget what matters"
        description="When was the last time you forgot something important about a person? With Bondery all the important details about the people in your life and get reminded about them. From birthdays and anniversaries to how you met, education history, work details, family info, gift ideas, and anything else you don't want to forget. Your memory, on steroids."
        imagePosition="right"
        imagePlaceholder={
          <Image
            component={NextImage}
            src="/images/hero/details.png"
            alt="Integrations overview"
            width={1200}
            height={900}
            sizes="(max-width: 768px) 100vw, 500px"
            radius={"lg"}
            style={{
              width: "100%",
              maxWidth: 500,
              height: "auto",
              aspectRatio: "4/3",
              objectFit: "contain",
            }}
          />
        }
      />

      <FeatureSection
        title="Open-source and privacy-first"
        description="Your contacts are precious and should not be shared for profit. Bondery is fully open-source and hosted on EU servers, with data that stays in Europe. Self-hosting option coming soon. You own your data, always."
        imagePosition="left"
        imagePlaceholder={<ImagePlaceholder color="green" />}
      />
    </Box>
  );
}
