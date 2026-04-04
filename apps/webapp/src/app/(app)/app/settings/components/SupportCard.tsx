"use client";

import { Text, Group, CardSection, Paper, Stack, ThemeIcon, UnstyledButton } from "@mantine/core";
import {
  IconLifebuoy,
  IconBook,
  IconMail,
  IconMessageCircle,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { modals } from "@mantine/modals";
import { ModalTitle } from "@bondery/mantine-next";
import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { WEBSITE_URL } from "@/lib/config";
import { FeedbackModal } from "./FeedbackModal";
import { SettingsSection } from "./SettingsSection";
import type { ComponentType } from "react";

interface SupportItemCardProps {
  icon: ComponentType<{ size?: number; stroke?: number }>;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

function SupportItemCard({ icon: Icon, title, description, href, onClick }: SupportItemCardProps) {
  const inner = (
    <Paper
      shadow="xs"
      withBorder
      p="md"
      h="100%"
      className="button-scale-effect"
      style={{ cursor: "pointer" }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <ThemeIcon variant="light" size="md" radius="sm">
            <Icon size={16} stroke={1.5} />
          </ThemeIcon>
          <IconChevronRight
            size={14}
            stroke={1.5}
            style={{ color: "var(--mantine-color-dimmed)" }}
          />
        </Group>
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
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
        target="_blank"
        rel="noopener noreferrer"
        style={{ flex: 1 }}
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
  const t = useTranslations("SettingsPage.Support");
  const tFeedback = useTranslations("FeedbackPage");

  const openFeedbackModal = () => {
    const modalId = "feedback-modal";
    modals.open({
      modalId,
      title: (
        <ModalTitle text={t("FeedbackTitle")} icon={<IconMessageCircle size={20} stroke={1.5} />} />
      ),
      size: "lg",
      children: <FeedbackModal modalId={modalId} t={tFeedback} />,
    });
  };

  return (
    <SettingsSection id="support" icon={<IconLifebuoy size={20} stroke={1.5} />} title={t("Title")}>
      <CardSection inheritPadding py="md">
        <Group grow align="stretch" gap="md">
          <SupportItemCard
            icon={IconBook}
            title={t("DocumentationTitle")}
            description={t("DocumentationDescription")}
            href={`${WEBSITE_URL}${WEBSITE_ROUTES.DOCS}`}
          />
          <SupportItemCard
            icon={IconMail}
            title={t("ContactTitle")}
            description={t("ContactDescription")}
            href={`${WEBSITE_URL}${WEBSITE_ROUTES.CONTACT}`}
          />
          <SupportItemCard
            icon={IconMessageCircle}
            title={t("FeedbackTitle")}
            description={t("FeedbackDescription")}
            onClick={openFeedbackModal}
          />
        </Group>
      </CardSection>
    </SettingsSection>
  );
}
