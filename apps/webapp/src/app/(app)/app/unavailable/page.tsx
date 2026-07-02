"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { fetchApiHealthReport, type HealthReport } from "@/lib/api/health";

function statusColor(status: HealthReport["status"] | "unknown"): string {
  if (status === "ok") return "green";
  if (status === "degraded") return "yellow";
  if (status === "unhealthy") return "red";
  return "gray";
}

export default function UnavailablePage() {
  const t = useTranslations("UnavailablePage");
  const [isRetrying, setIsRetrying] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<number | null>(null);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [healthReachable, setHealthReachable] = useState(false);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    const result = await fetchApiHealthReport();
    setHealthReachable(result.reachable);
    setHealthStatus(result.status);
    setHealthReport(result.reachable ? result.report : null);
    setHealthLoading(false);
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const handleRetry = () => {
    setIsRetrying(true);
    void loadHealth().finally(() => {
      window.location.reload();
    });
  };

  const reportStatus = healthReport?.status ?? "unknown";

  return (
    <Stack align="center" justify="center" mih="70vh" px="md" gap="lg">
      <Stack align="center" gap="xs" maw={480}>
        <Title order={2} ta="center">
          {t("Title")}
        </Title>
        <Text c="dimmed" ta="center">
          {t("Description")}
        </Text>
      </Stack>

      <Button
        leftSection={<IconRefresh size={16} />}
        onClick={handleRetry}
        loading={isRetrying}
      >
        {t("Retry")}
      </Button>

      <Card withBorder radius="md" padding="lg" maw={520} w="100%">
        <Stack gap="sm">
          <Text fw={600}>{t("HealthTitle")}</Text>
          {healthLoading ? (
            <Text size="sm" c="dimmed">
              {t("HealthLoading")}
            </Text>
          ) : (
            <>
              <Group gap="xs">
                <Text size="sm">{t("BffStatus")}</Text>
                <Badge color={healthReachable ? "green" : "red"} variant="light">
                  {healthReachable
                    ? t("BffReachable", { status: healthStatus ?? "?" })
                    : t("BffUnreachable")}
                </Badge>
              </Group>
              {healthReport ? (
                <Group gap="xs">
                  <Text size="sm">{t("ApiStatus")}</Text>
                  <Badge color={statusColor(reportStatus)} variant="light">
                    {reportStatus}
                  </Badge>
                </Group>
              ) : null}
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
