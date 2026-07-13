"use client";

import { Box, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowNarrowDown } from "@tabler/icons-react";
import type { FunnelPeriod } from "@/lib/api/resources/stats";
import { useStatsPageTranslations } from "@/lib/i18n/generated/hooks";

interface FunnelStepProps {
  color: string;
  count: number;
  label: string;
  /** Width as a percentage of the top-of-funnel step (0–100) */
  widthPct: number;
}

function FunnelStep({ label, count, widthPct, color }: FunnelStepProps) {
  return (
    <Group align="center" gap="md" wrap="nowrap">
      <Box
        bg={`var(--mantine-color-${color}-6)`}
        style={{
          alignItems: "center",
          borderRadius: 4,
          display: "flex",
          height: 40,
          minWidth: 8,
          paddingInline: 12,
          transition: "width 0.4s ease",
          width: `${widthPct}%`,
        }}
      >
        <Text c="white" fw={700} size="sm" style={{ whiteSpace: "nowrap" }}>
          {count.toLocaleString()}
        </Text>
      </Box>
      <Text fw={500} size="sm" style={{ whiteSpace: "nowrap" }}>
        {label}
      </Text>
    </Group>
  );
}

interface ConversionRowProps {
  label: string;
}

function ConversionRow({ label }: ConversionRowProps) {
  return (
    <Group c="dimmed" gap={6} pl={4}>
      <IconArrowNarrowDown size={14} />
      <Text size="xs">{label}</Text>
    </Group>
  );
}

interface FunnelChartProps {
  data: FunnelPeriod[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  const t = useStatsPageTranslations();

  return (
    <Card padding="lg" withBorder>
      <Text fw={500} mb="xs">
        {t("Funnel")}
      </Text>
      <Text c="dimmed" mb="xl" size="xs">
        {t("FunnelDescription")}
      </Text>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {data.map((period) => {
          const max = Math.max(period.signups, 1);
          const contactsWidthPct = Math.round((period.contacts / max) * 100);
          const interactionsWidthPct = Math.round((period.interactions / max) * 100);

          return (
            <Card key={period.periodKey} padding="md" withBorder>
              <Text fw={600} mb="sm" size="sm">
                {period.periodKey === "last_14_days"
                  ? t("FunnelLast14Days")
                  : period.periodKey === "days_14_to_28_ago"
                    ? t("Funnel14To28DaysAgo")
                    : period.periodKey === "last_30_days"
                      ? t("FunnelLast30Days")
                      : period.periodLabel}
              </Text>

              <Stack gap={4} px="xs">
                <FunnelStep
                  color="indigo"
                  count={period.signups}
                  label={t("Signups")}
                  widthPct={100}
                />
                <ConversionRow
                  label={t("FunnelSignupsToContacts", {
                    pct: period.signupsToContactsPct,
                  })}
                />
                <FunnelStep
                  color="teal"
                  count={period.contacts}
                  label={t("FunnelActivated")}
                  widthPct={Math.max(contactsWidthPct, 2)}
                />
                <ConversionRow
                  label={t("FunnelContactsToInteractions", {
                    pct: period.contactsToInteractionsPct,
                  })}
                />
                <FunnelStep
                  color="orange"
                  count={period.interactions}
                  label={t("Interactions")}
                  widthPct={Math.max(interactionsWidthPct, 2)}
                />
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Card>
  );
}
