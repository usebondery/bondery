// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { Box, Button, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { retryApiConnection } from "@/lib/api/availabilityStore";
import { OUTAGE_RESUME_DELAY_MS } from "@/lib/auth/constants";
import { handleUnauthorizedSession } from "@/lib/auth/handleUnauthorizedSession";
import { parseReturnIntent } from "@/lib/auth/returnIntent";
import { useUnavailablePageTranslations } from "@/lib/i18n/generated/hooks";
import { STATUS_URL } from "@/lib/platform/config";

const POLL_INTERVAL_MS = 5_000;

export function UnavailableClient() {
  const t = useUnavailablePageTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [sessionReachable, setSessionReachable] = useState<boolean | null>(null);
  const [secondsUntilPoll, setSecondsUntilPoll] = useState(POLL_INTERVAL_MS / 1000);
  const isNavigatingRef = useRef(false);

  const navigateBack = async () => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    setIsNavigating(true);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, OUTAGE_RESUME_DELAY_MS);
    });

    const returnTo = parseReturnIntent(searchParams) ?? WEBAPP_ROUTES.HOME;
    router.replace(returnTo);
    router.refresh();
  };

  const probeSession = async (): Promise<boolean> => {
    const result = await retryApiConnection();
    if (result === "unauthorized") {
      void handleUnauthorizedSession();
      return false;
    }
    if (result === "ok") {
      setSessionReachable(true);
      void navigateBack();
      return true;
    }
    setSessionReachable(false);
    return false;
  };

  useEffect(() => {
    void probeSession();
  }, [probeSession]);

  useEffect(() => {
    if (isNavigating || sessionReachable) {
      return;
    }

    const countdown = setInterval(() => {
      setSecondsUntilPoll((seconds) => {
        if (seconds <= 1) {
          void probeSession();
          return POLL_INTERVAL_MS / 1000;
        }
        return seconds - 1;
      });
    }, 1_000);

    return () => clearInterval(countdown);
  }, [isNavigating, probeSession, sessionReachable]);

  const handleRetry = async () => {
    if (isNavigating) {
      return;
    }
    setIsRetrying(true);
    setSecondsUntilPoll(POLL_INTERVAL_MS / 1000);
    try {
      await probeSession();
    } finally {
      if (!isNavigatingRef.current) {
        setIsRetrying(false);
      }
    }
  };

  const isChecking = sessionReachable === null || isRetrying || isNavigating;
  const showPollCountdown = sessionReachable === false && !isChecking;
  const statusLabel =
    sessionReachable === true
      ? t("StatusOnline")
      : isChecking
        ? t("StatusChecking")
        : t("StatusOffline");

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
      {isChecking ? (
        <Loader />
      ) : (
        <Group gap="sm" justify={centered ? "center" : "flex-start"} wrap="wrap">
          <Button
            aria-describedby={showPollCountdown ? "unavailable-poll-description" : undefined}
            className="min-w-40"
            disabled={isNavigating}
            loading={isRetrying || isNavigating}
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
          {isChecking ? (
            <Loader size="sm" />
          ) : (
            <Text c="dimmed" size="sm" ta="center">
              {statusLabel}
            </Text>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
