import { AnthropicIcon } from "@bondery/branding/react";
import { ButtonLink } from "@bondery/mantine-next";
import { Box, Container, Grid, GridCol, Group, Stack, Text, Title } from "@mantine/core";
import { IconPlug } from "@tabler/icons-react";
import { routeAssert } from "@/lib/navigation/route/assert";
import { AnimatedPeople } from "./AnimatedPeople";
import { AssistantBriefingAnimation } from "./AssistantBriefingAnimation";
import { PrivacyCodeAnimation } from "./PrivacyCodeAnimation";
import { SyncedConnectionsAnimation } from "./SyncedConnectionsAnimation";

type FeatureSectionProps = {
  title: string;
  description: string;
  imagePosition: "left" | "right";
  imagePlaceholder: React.ReactNode;
  action?: React.ReactNode;
};

const FeatureSection = ({
  title,
  description,
  imagePosition,
  imagePlaceholder,
  action,
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
        {action ? <Box mt="lg">{action}</Box> : null}
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
        description="Import from LinkedIn and Instagram, then keep records current when you save a profile. The same hub is on web and mobile, and open to your apps via API."
        imagePlaceholder={<SyncedConnectionsAnimation />}
        imagePosition="left"
        title="The contact hub that updates itself"
      />

      <FeatureSection
        action={
          <Group gap="sm">
            <ButtonLink
              href={routeAssert("/docs/apps/mcp-server")}
              leftSection={<AnthropicIcon color="white" size={18} />}
              size="md"
            >
              Add to Claude
            </ButtonLink>
            <ButtonLink
              href={routeAssert("/docs/bondery/mcp")}
              leftSection={<IconPlug size={18} />}
              size="md"
              variant="default"
            >
              Other MCP clients
            </ButtonLink>
          </Group>
        }
        description="Your assistant answers the questions you ask a good friend: who should I catch up with, what did we talk about. Bondery gives it your contacts, and it saves the person you just met. Install the Bondery plugin in Claude, or connect any MCP client."
        imagePlaceholder={<AssistantBriefingAnimation />}
        imagePosition="right"
        title="Ask your assistant. It knows your people."
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
