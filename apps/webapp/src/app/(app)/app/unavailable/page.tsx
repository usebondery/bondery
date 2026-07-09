"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { Box, Button, Collapse, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deriveUserHealthStatus,
  fetchApiHealthReport,
  type HealthCheckResult,
  type UserHealthStatus,
} from "@/lib/api/health";
import { RETURN_TO_STORAGE_KEY } from "@/lib/auth/handleApiUnavailable";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { STATUS_URL } from "@/lib/platform/config";

const POLL_INTERVAL_FAST_MS = 5_000;
const POLL_INTERVAL_SLOW_MS = 30_000;
const FAILURES_BEFORE_BACKOFF = 5;

export default function UnavailablePage() {
  const t = useWebTranslations("UnavailablePage");
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
  const statusLabel =
    userStatus === "online"
      ? t("StatusOnline")
      : userStatus === "degraded"
        ? t("StatusDegraded")
        : userStatus === "offline"
          ? t("StatusOffline")
          : t("StatusChecking");

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
    <Stack align={centered ? "center" : "flex-start"} gap="sm">
      <Title fw={600} order={2} ta={centered ? "center" : "left"}>
        {t("Title")}
      </Title>
      <Text c="dimmed" lh={1.6} size="md" ta={centered ? "center" : "left"}>
        {t("Description")}
      </Text>
    </Stack>
  );

  const actionStack = (centered: boolean) => (
    <Stack align={centered ? "center" : "flex-start"} gap={4}>
      {healthLoading ? (
        <Loader />
      ) : (
        <Group gap="sm" justify={centered ? "center" : "flex-start"} wrap="wrap">
          <Button
            aria-describedby={showPollCountdown ? "unavailable-poll-description" : undefined}
            className="min-w-40"
            disabled={isNavigating}
            loading={isPolling || isRetrying || isNavigating}
            onClick={() => void handleRetry()}
          >
            {t("Retry")}
          </Button>
          <Button
            component="a"
            data-disabled={isNavigating || undefined}
            disabled={isNavigating}
            href={STATUS_URL}
            onClick={(event) => {
              if (isNavigating) {
                event.preventDefault();
              }
            }}
            rel="noopener noreferrer"
            target="_blank"
            variant="default"
          >
            {t("StatusPageLink")}
          </Button>
        </Group>
      )}
      {showPollCountdown ? (
        <Text
          c="dimmed"
          id="unavailable-poll-description"
          size="xs"
          ta={centered ? "center" : "left"}
        >
          {t("CheckingAgain", { seconds: secondsUntilPoll })}
        </Text>
      ) : null}
    </Stack>
  );

  return (
    <Box mih="100dvh" style={{ display: "flex", flexDirection: "column" }}>
      <Box
        component="main"
        px={{ base: "xl", lg: 80, sm: 48 }}
        py="xl"
        style={{ alignItems: "center", display: "flex", flex: 1, justifyContent: "center" }}
      >
        <Stack align="center" gap="xl" hiddenFrom="sm" maw={720} mx="auto" w="100%">
          <Text aria-hidden fz={72} lh={1} ta="center">
            🤖
          </Text>
          {copyStack(true)}
          {actionStack(true)}
        </Stack>

        <Box
          maw={720}
          mx="auto"
          style={{
            alignItems: "center",
            columnGap: "var(--mantine-spacing-xl)",
            display: "grid",
            gridTemplateColumns: "minmax(96px, auto) 1fr",
            rowGap: "var(--mantine-spacing-xl)",
          }}
          visibleFrom="sm"
          w="100%"
        >
          <Text
            aria-hidden
            fz={96}
            lh={1}
            style={{ alignSelf: "center", gridRow: "1 / 3" }}
            ta="center"
          >
            🤖
          </Text>
          {copyStack(false)}
          {actionStack(false)}
        </Box>
      </Box>

      <Box pb="xl" px={{ base: "xl", lg: 80, sm: 48 }}>
        <Stack align="center" gap="xs">
          {healthLoading ? (
            <Loader />
          ) : (
            <Text c="dimmed" size="sm" ta="center">
              {statusLabel}
            </Text>
          )}
          <Text
            c="dimmed"
            component="button"
            onClick={() => setTechnicalOpen((open) => !open)}
            size="sm"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            td={technicalOpen ? "underline" : undefined}
            type="button"
          >
            {t("TechnicalDetails")}
          </Text>
          <Collapse expanded={technicalOpen}>
            <Stack align="center" gap={4} maw={480} mx="auto" pt="sm">
              {healthResult ? (
                <>
                  <Text c="dimmed" ff="monospace" size="sm" ta="center">
                    {t("TechnicalHttpStatus", {
                      status: healthResult.reachable
                        ? String(healthResult.status)
                        : t("TechnicalUnreachable"),
                    })}
                  </Text>
                  {report ? (
                    <Text c="dimmed" ff="monospace" size="sm" ta="center">
                      {t("TechnicalBackendStatus", { status: report.status })}
                    </Text>
                  ) : healthResult.reachable && healthResult.status >= 500 ? (
                    <Text c="dimmed" ff="monospace" size="sm" ta="center">
                      {t("TechnicalBackendStatus", { status: t("TechnicalUnreachable") })}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text c="dimmed" size="sm" ta="center">
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
