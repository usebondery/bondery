"use client";

import { Button, Group, Paper, Text, Tooltip } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

/**
 * Displays an informational card for the user's own "myself" contact,
 * explaining that it represents their profile and cannot be deleted.
 */
export function MyselfRecommendationCard() {
  const t = useTranslations("MyselfRecommendationCard");
  const router = useRouter();

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{ borderLeft: "2px solid var(--mantine-color-violet-6)" }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group align="center" wrap="nowrap">
          <Tooltip label={t("BadgeTooltip")} multiline maw={280} withArrow>
            <Group gap={4} align="center" wrap="nowrap" style={{ cursor: "default" }}>
              <IconUser size={14} color="var(--mantine-color-violet-6)" />
              <Text size="sm" fw={600} c="violet.6">
                {t("Badge")}
              </Text>
            </Group>
          </Tooltip>
          <Text size="sm" c="dimmed">
            {t("Description")}
          </Text>
        </Group>
        <Button variant="default" onClick={() => router.push(WEBAPP_ROUTES.SETTINGS)}>
          {t("GoToSettings")}
        </Button>
      </Group>
    </Paper>
  );
}
