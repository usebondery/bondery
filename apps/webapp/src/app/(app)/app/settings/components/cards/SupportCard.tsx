"use client";

import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { CardSection, Group, Paper, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import {
  IconBook,
  IconChevronRight,
  IconLifebuoy,
  IconMail,
  IconMessageCircle,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { getWebappRuntimeConfigSync } from "@/lib/platform/runtimeConfig.client";
import { openFeedbackModal } from "../modals/openFeedbackModal";
import { SettingsSection } from "./SettingsSection";

interface SupportItemCardProps {
  description: string;
  href?: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  onClick?: () => void;
  title: string;
}

function SupportItemCard({ icon: Icon, title, description, href, onClick }: SupportItemCardProps) {
  const inner = (
    <Paper
      className="button-scale-effect"
      h="100%"
      p="md"
      shadow="xs"
      style={{ cursor: "pointer" }}
      withBorder
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <ThemeIcon radius="sm" size="md" variant="light">
            <Icon size={16} stroke={1.5} />
          </ThemeIcon>
          <IconChevronRight
            size={14}
            stroke={1.5}
            style={{ color: "var(--mantine-color-dimmed)" }}
          />
        </Group>
        <Stack gap={2}>
          <Text fw={500} size="sm">
            {title}
          </Text>
          <Text c="dimmed" lineClamp={2} size="xs">
            {description}
          </Text>
        </Stack>
      </Stack>
    </Paper>
  );

  if (href) {
    return (
      <UnstyledButton
        component="a"
        href={href}
        rel="noopener noreferrer"
        style={{ flex: 1 }}
        target="_blank"
      >
        {inner}
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton onClick={onClick} style={{ flex: 1 }}>
      {inner}
    </UnstyledButton>
  );
}

export function SupportCard() {
  const t = useSettingsPageTranslations("Support");
  const { websiteUrl } = getWebappRuntimeConfigSync();

  const handleOpenFeedbackModal = () => {
    openFeedbackModal();
  };

  return (
    <SettingsSection icon={<IconLifebuoy size={20} stroke={1.5} />} id="support" title={t("Title")}>
      <CardSection inheritPadding py="md">
        <Group align="stretch" gap="md" grow>
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
        </Group>
      </CardSection>
    </SettingsSection>
  );
}
