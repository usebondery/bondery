"use client";

import { Card, Text, Stack, Group, Box, SimpleGrid } from "@mantine/core";
import { IconArrowNarrowDown } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { FunnelPeriod } from "../getStatsData";

interface FunnelStepProps {
  label: string;
  count: number;
  /** Width as a percentage of the top-of-funnel step (0–100) */
  widthPct: number;
  color: string;
}

function FunnelStep({ label, count, widthPct, color }: FunnelStepProps) {
  return (
    <Group gap="md" align="center" wrap="nowrap">
      <Box
        bg={`var(--mantine-color-${color}-6)`}
        style={{
          width: `${widthPct}%`,
          minWidth: 8,
          height: 40,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          paddingInline: 12,
          transition: "width 0.4s ease",
        }}
      >
        <Text fw={700} size="sm" c="white" style={{ whiteSpace: "nowrap" }}>
          {count.toLocaleString()}
        </Text>
      </Box>
      <Text size="sm" fw={500} style={{ whiteSpace: "nowrap" }}>
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
    <Group gap={6} c="dimmed" pl={4}>
      <IconArrowNarrowDown size={14} />
      <Text size="xs">{label}</Text>
    </Group>
  );
}

interface FunnelChartProps {
  data: FunnelPeriod[];
}

function periodTitle(t: ReturnType<typeof useTranslations>, periodKey: string, fallback: string) {
  if (periodKey === "last_14_days") return t("FunnelLast14Days");
  if (periodKey === "days_14_to_28_ago") return t("Funnel14To28DaysAgo");
  if (periodKey === "last_30_days") return t("FunnelLast30Days");
  return fallback;
}

export function FunnelChart({ data }: FunnelChartProps) {
  const t = useTranslations("StatsPage");

  return (
    <Card withBorder padding="lg">
      <Text fw={500} mb="xs">
        {t("Funnel")}
      </Text>
      <Text size="xs" c="dimmed" mb="xl">
        {t("FunnelDescription")}
      </Text>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {data.map((period) => {
          const max = Math.max(period.signups, 1);
          const contactsWidthPct = Math.round((period.contacts / max) * 100);
          const interactionsWidthPct = Math.round((period.interactions / max) * 100);

          return (
            <Card key={period.periodKey} withBorder padding="md">
              <Text fw={600} size="sm" mb="sm">
                {periodTitle(t, period.periodKey, period.periodLabel)}
              </Text>

              <Stack gap={4} px="xs">
                <FunnelStep
                  label={t("Signups")}
                  count={period.signups}
                  widthPct={100}
                  color="indigo"
                />
                <ConversionRow
                  label={t("FunnelSignupsToContacts", {
                    pct: period.signupsToContactsPct,
                  })}
                />
                <FunnelStep
                  label={t("FunnelActivated")}
                  count={period.contacts}
                  widthPct={Math.max(contactsWidthPct, 2)}
                  color="teal"
                />
                <ConversionRow
                  label={t("FunnelContactsToInteractions", {
                    pct: period.contactsToInteractionsPct,
                  })}
                />
                <FunnelStep
                  label={t("Interactions")}
                  count={period.interactions}
                  widthPct={Math.max(interactionsWidthPct, 2)}
                  color="orange"
                />
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Card>
  );
}
