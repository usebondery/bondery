"use client";

import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import {
  CardSection,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBook,
  IconChevronRight,
  IconLifebuoy,
  IconMail,
  IconMessageCircle,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import { SETTINGS_SUPPORT_SECTION_ID } from "../../settingsSectionIds";
import { openFeedbackModal } from "../modals/openFeedbackModal";
import { SettingsSection } from "./SettingsSection";

interface SupportItemCardProps {
  description: string;
  href?: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  onClick?: () => void;
  title: string;
}

/**
 * One support destination. The icon, the text block and the chevron stay in a
 * single row at every width, so a phone row and a desktop tile read the same:
 * icon on the left, destination text in the middle, the way out on the right.
 *
 * The row centres vertically. Cards in a grid row are equal height, so a card
 * whose description is one line would otherwise sit its content against the top
 * next to a two-line neighbour.
 */
function SupportItemCard({ icon: Icon, title, description, href, onClick }: SupportItemCardProps) {
  const inner = (
    <Paper className="button-scale-effect" h="100%" p="md" shadow="xs" withBorder>
      <Group align="center" gap="sm" h="100%" wrap="nowrap">
        <ThemeIcon radius="sm" size="md" variant="light">
          <Icon size={16} stroke={1.5} />
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={500} size="sm">
            {title}
          </Text>
          <Text c="dimmed" size="xs">
            {description}
          </Text>
        </Stack>
        <IconChevronRight
          size={14}
          stroke={1.5}
          style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }}
        />
      </Group>
    </Paper>
  );

  if (href) {
    return (
      <UnstyledButton component="a" href={href} rel="noopener noreferrer" target="_blank" w="100%">
        {inner}
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton onClick={onClick} w="100%">
      {inner}
    </UnstyledButton>
  );
}

export function SupportCard() {
  const t = useSettingsPageTranslations("Support");
  const { websiteUrl } = useWebappRuntimeConfig();

  const handleOpenFeedbackModal = () => {
    openFeedbackModal();
  };
  return (
    <SettingsSection
      icon={<IconLifebuoy size={20} stroke={1.5} />}
      id={SETTINGS_SUPPORT_SECTION_ID}
      title={t("Title")}
    >
      <CardSection inheritPadding py="md">
        {/*
          Columns follow the width of this card, not the viewport. The 280px rail and
          the page gutter decide how much room these rows really get, so a 1024px
          window has a narrower column than a 768px one. One row per destination until
          three tiles keep a 288px measure (3 x 288px + 2 x 16px gaps = 896px). Below
          that, stacking beats shrinking: a 256px tile wraps its description to three
          lines, which is narrower text than the same row on a phone.
        */}
        <SimpleGrid cols={{ "56em": 3, base: 1 }} spacing="md" type="container">
          <SupportItemCard
            description={t("DocumentationDescription")}
            href={`${websiteUrl}${WEBSITE_ROUTES.DOCS}`}
            icon={IconBook}
            title={t("DocumentationTitle")}
          />
          <SupportItemCard
            description={t("ContactDescription")}
            href={`${websiteUrl}${WEBSITE_ROUTES.CONTACT}`}
            icon={IconMail}
            title={t("ContactTitle")}
          />
          <SupportItemCard
            description={t("FeedbackDescription")}
            icon={IconMessageCircle}
            onClick={handleOpenFeedbackModal}
            title={t("FeedbackTitle")}
          />
        </SimpleGrid>
      </CardSection>
    </SettingsSection>
  );
}
