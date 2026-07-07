"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Collapse, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  deriveUserHealthStatus,
  fetchApiHealthReport,
  type HealthCheckResult,
  type UserHealthStatus,
} from "@/lib/api/health";
import { RETURN_TO_STORAGE_KEY } from "@/lib/auth/handleApiUnavailable";
import { STATUS_URL } from "@/lib/config";

const POLL_INTERVAL_FAST_MS = 5_000;
const POLL_INTERVAL_SLOW_MS = 30_000;
const FAILURES_BEFORE_BACKOFF = 5;

function statusLabel(
  t: ReturnType<typeof useTranslations>,
  status: UserHealthStatus,
): string {
  if (status === "online") return t("StatusOnline");
  if (status === "degraded") return t("StatusDegraded");
  if (status === "offline") return t("StatusOffline");
  return t("StatusChecking");
}

export default function UnavailablePage() {
  const t = useTranslations("UnavailablePage");
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState(POLL_INTERVAL_FAST_MS);
  const [secondsUntilPoll, setSecondsUntilPoll] = useState(POLL_INTERVAL_FAST_MS / 1000);
  const consecutiveFailuresRef = useRef(0);
  const isNavigatingRef = useRef(false);
  const isPollingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const userStatus = deriveUserHealthStatus(healthLoading, healthResult);
  const isChecking = healthLoading || isPolling || isRetrying || isNavigating;
  const showPollCountdown = userStatus !== "online" && !isChecking;

  const navigateBack = useCallback(() => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    setIsNavigating(true);
    const returnTo = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
    router.replace(returnTo ?? WEBAPP_ROUTES.HOME);
    router.refresh();
  }, [router]);

  const loadHealth = useCallback(
    async (options?: { initial?: boolean }): Promise<UserHealthStatus> => {
      if (isNavigatingRef.current || isPollingRef.current) {
        return "checking";
      }

      const initial = options?.initial === true;
      isPollingRef.current = true;
      if (initial) {
        setHealthLoading(true);
      } else {
        setIsPolling(true);
      }

      try {
        const result = await fetchApiHealthReport();
        setHealthResult(result);

        const status = deriveUserHealthStatus(false, result);
        if (status === "online") {
          navigateBack();
        } else {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= FAILURES_BEFORE_BACKOFF) {
            setPollIntervalMs(POLL_INTERVAL_SLOW_MS);
          }
        }

        setSecondsUntilPoll(Math.ceil(pollIntervalMs / 1000));
        return status;
      } finally {
        if (!isNavigatingRef.current) {
          isPollingRef.current = false;
          if (initial) {
            setHealthLoading(false);
          } else {
            setIsPolling(false);
          }
        }
      }
    },
    [navigateBack, pollIntervalMs],
  );

  useEffect(() => {
    if (initialLoadDoneRef.current || isNavigatingRef.current) {
      return;
    }
    initialLoadDoneRef.current = true;
    void loadHealth({ initial: true });
  }, [loadHealth]);

  useEffect(() => {
    setSecondsUntilPoll(Math.ceil(pollIntervalMs / 1000));
  }, [pollIntervalMs]);

  useEffect(() => {
    if (isNavigatingRef.current || isChecking) {
      return;
    }

    if (secondsUntilPoll > 0) {
      const countdown = setInterval(() => {
        setSecondsUntilPoll((seconds) => Math.max(0, seconds - 1));
      }, 1_000);

      return () => clearInterval(countdown);
    }

    void loadHealth();
  }, [isChecking, loadHealth, secondsUntilPoll]);

  const handleRetry = async () => {
    if (isNavigating) {
      return;
    }
    setIsRetrying(true);
    consecutiveFailuresRef.current = 0;
    setPollIntervalMs(POLL_INTERVAL_FAST_MS);
    setSecondsUntilPoll(Math.ceil(POLL_INTERVAL_FAST_MS / 1000));
    try {
      await loadHealth();
    } finally {
      if (!isNavigatingRef.current) {
        setIsRetrying(false);
      }
    }
  };

  const report = healthResult?.reachable ? healthResult.report : null;

  const copyStack = (centered: boolean) => (
    <Stack gap="sm" align={centered ? "center" : "flex-start"}>
      <Title order={2} fw={600} ta={centered ? "center" : "left"}>
        {t("Title")}
      </Title>
      <Text size="md" c="dimmed" lh={1.6} ta={centered ? "center" : "left"}>
        {t("Description")}
      </Text>
    </Stack>
  );

  const actionStack = (centered: boolean) => (
    <Stack gap={4} align={centered ? "center" : "flex-start"}>
      {healthLoading ? (
        <Loader />
      ) : (
        <Group gap="sm" wrap="wrap" justify={centered ? "center" : "flex-start"}>
          <Button
            className="min-w-40"
            onClick={() => void handleRetry()}
            loading={isPolling || isRetrying || isNavigating}
            disabled={isNavigating}
            aria-describedby={showPollCountdown ? "unavailable-poll-description" : undefined}
          >
            {t("Retry")}
          </Button>
          <Button
            variant="default"
            component="a"
            href={STATUS_URL}
            target="_blank"
            rel="noopener noreferrer"
            disabled={isNavigating}
            data-disabled={isNavigating || undefined}
            onClick={(event) => {
              if (isNavigating) {
                event.preventDefault();
              }
            }}
          >
            {t("StatusPageLink")}
          </Button>
        </Group>
      )}
      {showPollCountdown ? (
        <Text size="xs" c="dimmed" ta={centered ? "center" : "left"} id="unavailable-poll-description">
          {t("CheckingAgain", { seconds: secondsUntilPoll })}
        </Text>
      ) : null}
    </Stack>
  );

  return (
    <Box mih="100dvh" style={{ display: "flex", flexDirection: "column" }}>
      <Box
        component="main"
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
        px={{ base: "xl", sm: 48, lg: 80 }}
        py="xl"
      >
        <Stack gap="xl" w="100%" maw={720} align="center" mx="auto" hiddenFrom="sm">
          <Text aria-hidden fz={72} lh={1} ta="center">
            🤖
          </Text>
          {copyStack(true)}
          {actionStack(true)}
        </Stack>

        <Box
          w="100%"
          maw={720}
          mx="auto"
          visibleFrom="sm"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(96px, auto) 1fr",
            columnGap: "var(--mantine-spacing-xl)",
            rowGap: "var(--mantine-spacing-xl)",
            alignItems: "center",
          }}
        >
          <Text
            aria-hidden
            fz={96}
            lh={1}
            ta="center"
            style={{ gridRow: "1 / 3", alignSelf: "center" }}
          >
            🤖
          </Text>
          {copyStack(false)}
          {actionStack(false)}
        </Box>
      </Box>

      <Box pb="xl" px={{ base: "xl", sm: 48, lg: 80 }}>
        <Stack gap="xs" align="center">
          {healthLoading ? (
            <Loader />
          ) : (
            <Text size="sm" c="dimmed" ta="center">
              {statusLabel(t, userStatus)}
            </Text>
          )}
          <Text
            component="button"
            type="button"
            size="sm"
            c="dimmed"
            td={technicalOpen ? "underline" : undefined}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={() => setTechnicalOpen((open) => !open)}
          >
            {t("TechnicalDetails")}
          </Text>
          <Collapse expanded={technicalOpen}>
            <Stack gap={4} pt="sm" maw={480} mx="auto" align="center">
              {healthResult ? (
                <>
                  <Text size="sm" c="dimmed" ff="monospace" ta="center">
                    {t("TechnicalHttpStatus", {
                      status: healthResult.reachable
                        ? String(healthResult.status)
                        : t("TechnicalUnreachable"),
                    })}
                  </Text>
                  {report ? (
                    <Text size="sm" c="dimmed" ff="monospace" ta="center">
                      {t("TechnicalBackendStatus", { status: report.status })}
                    </Text>
                  ) : healthResult.reachable && healthResult.status >= 500 ? (
                    <Text size="sm" c="dimmed" ff="monospace" ta="center">
                      {t("TechnicalBackendStatus", { status: t("TechnicalUnreachable") })}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text size="sm" c="dimmed" ta="center">
                  {t("StatusChecking")}
                </Text>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </Box>
    </Box>
  );
}
