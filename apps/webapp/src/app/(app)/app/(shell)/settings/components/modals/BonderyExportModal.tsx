// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import { ApiError, getUserFacingError } from "@bondery/helpers/api";
import { CountChip, ModalFooter } from "@bondery/mantine-next";
import { Alert, Button, Center, Group, Loader, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAlertCircle,
  IconDownload,
  IconRefresh,
  IconTag,
  IconTimelineEventText,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { captureEvent } from "@/lib/analytics/client";
import {
  BonderyExportDownloadBlockedError,
  downloadBonderyExport,
  getExportSummary,
  saveBonderyExportFile,
} from "@/lib/api/domains/export";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useModalBlocking } from "@/lib/modals";

const EXPORT_CLIENT_TIMEOUT_MS = 120_000;

type ExportPhase = "error" | "generating" | "idle";
type ExportErrorKind = "api" | "blocked" | "timeout";

interface BonderyExportModalProps {
  modalId: string;
}

export function BonderyExportModal({ modalId }: BonderyExportModalProps) {
  const t = useSettingsPageTranslations("DataManagement.Export");
  const tCommon = useCommonTranslations();
  const abortRef = useRef<AbortController | null>(null);
  const abortReasonRef = useRef<"cancel" | "timeout" | null>(null);
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [errorKind, setErrorKind] = useState<ExportErrorKind>("api");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [groups, setGroups] = useState<number | null>(null);
  const [tags, setTags] = useState<number | null>(null);
  const [interactions, setInteractions] = useState<number | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [summaryAttempt, setSummaryAttempt] = useState(0);

  const isGenerating = phase === "generating";
  const countsLoading = !countsFailed && people === null;
  useModalBlocking(modalId, isGenerating);

  const closeModal = () => modals.close(modalId);

  useEffect(() => {
    void summaryAttempt;
    const summaryAbort = new AbortController();
    setCountsFailed(false);
    setPeople(null);
    setGroups(null);
    setTags(null);
    setInteractions(null);

    void getExportSummary({ signal: summaryAbort.signal })
      .then((response) => {
        if (!response) {
          setCountsFailed(true);
          return;
        }
        setPeople(response.exportSummary.people);
        setGroups(response.exportSummary.groups);
        setTags(response.exportSummary.tags);
        setInteractions(response.exportSummary.interactions);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setCountsFailed(true);
      });

    return () => {
      summaryAbort.abort();
    };
  }, [summaryAttempt]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const isEmptyAccount = people === 0 && groups === 0 && tags === 0 && interactions === 0;

  const handleCancel = () => {
    if (isGenerating) {
      abortReasonRef.current = "cancel";
      abortRef.current?.abort();
      captureEvent("account_settings:export_cancel");
      setPhase("idle");
      return;
    }
    closeModal();
  };
  const handleDownload = async () => {
    abortReasonRef.current = null;
    const controller = new AbortController();
    abortRef.current = controller;
    setErrorMessage(null);
    setPhase("generating");
    captureEvent("account_settings:export_start");

    const timeoutId = window.setTimeout(() => {
      abortReasonRef.current = "timeout";
      controller.abort();
    }, EXPORT_CLIENT_TIMEOUT_MS);

    try {
      const result = await downloadBonderyExport({ signal: controller.signal });
      saveBonderyExportFile(result.blob, result.filename);
      closeModal();
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") {
        if (abortReasonRef.current === "timeout") {
          setErrorKind("timeout");
          setPhase("error");
          captureEvent("account_settings:export_fail", { error_code: "timeout" });
        }
        return;
      }

      if (caught instanceof BonderyExportDownloadBlockedError) {
        setErrorKind("blocked");
        setPhase("error");
        captureEvent("account_settings:export_fail", { error_code: "download_blocked" });
        return;
      }

      const errorCode = caught instanceof ApiError ? caught.code : "export_failed_to_generate";
      setErrorKind("api");
      setErrorMessage(getUserFacingError(caught, tCommon));
      setPhase("error");
      captureEvent("account_settings:export_fail", { error_code: errorCode });
    } finally {
      window.clearTimeout(timeoutId);
      abortRef.current = null;
    }
  };

  const errorTitle =
    errorKind === "timeout"
      ? t("TimeoutTitle")
      : errorKind === "blocked"
        ? t("BlockedTitle")
        : t("ErrorTitle");
  const errorBody =
    errorKind === "timeout"
      ? t("TimeoutBody")
      : errorKind === "blocked"
        ? t("BlockedBody")
        : (errorMessage ?? t("ErrorBody"));

  if (phase === "generating") {
    return (
      <Stack aria-busy="true" gap="md">
        <Center py="md">
          <Stack align="center" gap="sm">
            <Loader size="md" />
            <Text aria-live="polite" fw={500}>
              {t("PreparingTitle")}
            </Text>
            <Text c="dimmed" size="sm" ta="center">
              {t("PreparingBody")}
            </Text>
          </Stack>
        </Center>
        <ModalFooter cancelLabel={tCommon("actions.cancel")} onCancel={handleCancel} />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {phase === "error" ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />} title={errorTitle} variant="light">
          {errorBody}
        </Alert>
      ) : null}

      <Text size="sm">{t("ModalBody")}</Text>
      {countsFailed ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
          <Stack gap="xs">
            <Text size="sm">{t("CountsError")}</Text>
            <Button
              onClick={() => setSummaryAttempt((attempt) => attempt + 1)}
              size="xs"
              variant="light"
            >
              {tCommon("actions.retry")}
            </Button>
          </Stack>
        </Alert>
      ) : (
        <Group aria-busy={countsLoading || undefined} gap="xs" wrap="wrap">
          <CountChip
            color="blue"
            disabled={people === 0}
            icon={<IconUser size={14} stroke={1.5} />}
            isLoading={countsLoading}
            label={
              countsLoading ? tCommon("a11y.loading") : t("CountPeople", { count: people ?? 0 })
            }
          >
            {t("CountPeople", { count: people ?? 0 })}
          </CountChip>
          <CountChip
            color="teal"
            disabled={groups === 0}
            icon={<IconUsersGroup size={14} stroke={1.5} />}
            isLoading={countsLoading}
            label={
              countsLoading ? tCommon("a11y.loading") : t("CountGroups", { count: groups ?? 0 })
            }
          >
            {t("CountGroups", { count: groups ?? 0 })}
          </CountChip>
          <CountChip
            color="yellow"
            disabled={tags === 0}
            icon={<IconTag size={14} stroke={1.5} />}
            isLoading={countsLoading}
            label={countsLoading ? tCommon("a11y.loading") : t("CountTags", { count: tags ?? 0 })}
          >
            {t("CountTags", { count: tags ?? 0 })}
          </CountChip>
          <CountChip
            color="green"
            disabled={interactions === 0}
            icon={<IconTimelineEventText size={14} stroke={1.5} />}
            isLoading={countsLoading}
            label={
              countsLoading
                ? tCommon("a11y.loading")
                : t("CountInteractions", { count: interactions ?? 0 })
            }
          >
            {t("CountInteractions", { count: interactions ?? 0 })}
          </CountChip>
        </Group>
      )}
      {isEmptyAccount ? (
        <Text c="dimmed" size="sm">
          {t("EmptyHelper")}
        </Text>
      ) : null}

      <ModalFooter
        actionLabel={phase === "error" ? tCommon("actions.retry") : t("DownloadZip")}
        actionLeftSection={
          phase === "error" ? <IconRefresh size={16} /> : <IconDownload size={16} />
        }
        cancelLabel={tCommon("actions.cancel")}
        onAction={handleDownload}
        onCancel={handleCancel}
      />
    </Stack>
  );
}
