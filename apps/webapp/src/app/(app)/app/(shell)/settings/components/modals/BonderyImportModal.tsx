"use client";

import { ApiError, getUserFacingError } from "@bondery/helpers/api";
import { CountChip, ModalFooter, ModalTitle } from "@bondery/mantine-next";
import { Alert, Group, Stack, Text } from "@mantine/core";
import type { FileRejection } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { NavigationProgress } from "@mantine/nprogress";
import {
  IconAlertCircle,
  IconDatabaseImport,
  IconTag,
  IconTimelineEventText,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { captureEvent } from "@/lib/analytics/client";
import { captureImportComplete } from "@/lib/analytics/imports";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import {
  type BonderyImportPeekCounts,
  BonderyImportPeekError,
  peekBonderyExportZip,
} from "@/lib/import/peek-bondery-export-zip";
import { useModalBlocking } from "@/lib/modals";
import { useImportBonderyExportMutation } from "@/lib/query/hooks/useImports";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { useImporterNavigationProgress } from "../../hooks/useImporterNavigationProgress";
import { ImportIntroStep } from "../import/ImportIntroStep";
import { ImportProcessingStep } from "../import/ImportModalProcessingSteps";
import { IMPORT_ZIP_ACCEPT, ImportZipUploadStep } from "../import/ImportZipUploadStep";

const IMPORT_CLIENT_TIMEOUT_MS = 180_000;
const IMPORT_MAX_ZIP_BYTES = 100 * 1024 * 1024;

type ImportPhase = "checking" | "finished" | "importing" | "intro" | "review" | "upload";
type ImportErrorKind =
  | "api"
  | "file_too_large"
  | "instagram"
  | "invalid"
  | "linkedin"
  | "timeout"
  | "vcard";

const BONDERY_STEP_PROGRESS: Record<ImportPhase, number> = {
  checking: 44,
  finished: 100,
  importing: 84,
  intro: 12,
  review: 60,
  upload: 28,
};

function countChipsEmpty(counts: BonderyImportPeekCounts | null): boolean {
  if (!counts) {
    return true;
  }
  return (
    counts.people === 0 && counts.groups === 0 && counts.tags === 0 && counts.interactions === 0
  );
}

interface BonderyImportModalProps {
  modalId: string;
}

export function BonderyImportModal({ modalId }: BonderyImportModalProps) {
  const t = useSettingsPageTranslations("DataManagement.BonderyImport");
  const tCommon = useCommonTranslations();
  const openRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const abortReasonRef = useRef<"cancel" | "timeout" | null>(null);
  const fileRef = useRef<File | null>(null);

  const [phase, setPhase] = useState<ImportPhase>("intro");
  const [errorKind, setErrorKind] = useState<ImportErrorKind>("invalid");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileCounts, setFileCounts] = useState<BonderyImportPeekCounts | null>(null);
  const [insertedPeople, setInsertedPeople] = useState(0);
  const [insertedGroups, setInsertedGroups] = useState(0);
  const [insertedTags, setInsertedTags] = useState(0);
  const [insertedInteractions, setInsertedInteractions] = useState(0);

  const settingsQuery = useSettingsQuery();
  const importMutation = useImportBonderyExportMutation();

  const isChecking = phase === "checking";
  const isImporting = phase === "importing";
  useModalBlocking(modalId, isChecking || isImporting);

  useImporterNavigationProgress({
    importProgress: null,
    step: phase,
    stepProgress: BONDERY_STEP_PROGRESS,
  });

  const closeModal = () => modals.close(modalId);

  const renderWithNavigationProgress = (content: JSX.Element) => (
    <>
      <NavigationProgress />
      {content}
    </>
  );

  useEffect(() => {
    modals.updateModal({
      modalId,
      size: "lg",
      title: (
        <ModalTitle icon={<IconDatabaseImport size={20} stroke={1.5} />} text={t("ModalTitle")} />
      ),
    });
  }, [modalId, t]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  const showUploadError = phase === "upload" && errorMessage !== null;
  const showReviewError = phase === "review" && errorMessage !== null;
  const fileIsEmpty = countChipsEmpty(fileCounts);
  const zeroInserts =
    insertedPeople === 0 &&
    insertedGroups === 0 &&
    insertedTags === 0 &&
    insertedInteractions === 0;

  const peekErrorBody = (kind: ImportErrorKind): string => {
    if (kind === "linkedin") {
      return t("WrongFileLinkedIn");
    }
    if (kind === "instagram") {
      return t("WrongFileInstagram");
    }
    if (kind === "vcard") {
      return t("WrongFileVCard");
    }
    if (kind === "file_too_large") {
      return t("FileTooLarge");
    }
    return t("WrongFileGeneric");
  };

  const setError = (kind: ImportErrorKind, message: string | null) => {
    setErrorKind(kind);
    setErrorMessage(message);
  };

  const clearError = () => {
    setErrorMessage(null);
    setErrorKind("invalid");
  };

  const handleCancel = () => {
    if (isChecking) {
      cancelledRef.current = true;
      captureEvent("account_settings:import_cancel");
      setPhase("upload");
      return;
    }
    if (isImporting) {
      abortReasonRef.current = "cancel";
      abortRef.current?.abort();
      captureEvent("account_settings:import_cancel");
      setPhase("review");
      return;
    }
    closeModal();
  };
  const checkFile = async (file: File) => {
    cancelledRef.current = false;
    fileRef.current = file;
    clearError();
    setPhase("checking");

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (cancelledRef.current) {
        return;
      }
      const counts = peekBonderyExportZip(bytes);
      if (cancelledRef.current) {
        return;
      }
      setFileCounts(counts);
      setPhase("review");
    } catch (caught) {
      if (cancelledRef.current) {
        return;
      }
      const kind =
        caught instanceof BonderyImportPeekError ? caught.kind : ("invalid" as ImportErrorKind);
      setError(kind, peekErrorBody(kind));
      captureEvent("account_settings:import_fail", { error_code: kind });
      setPhase("upload");
    }
  };

  const handleDrop = (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }
    void checkFile(file);
  };

  const handleReject = (rejections: FileRejection[]) => {
    const tooLarge = rejections.some((rejection) =>
      rejection.errors.some((error) => error.code === "file-too-large"),
    );
    const kind: ImportErrorKind = tooLarge ? "file_too_large" : "invalid";
    setError(kind, peekErrorBody(kind));
    captureEvent("account_settings:import_fail", { error_code: kind });
    setPhase("upload");
  };

  const handleImport = async () => {
    const file = fileRef.current;
    if (!file || fileIsEmpty) {
      return;
    }

    abortReasonRef.current = null;
    const controller = new AbortController();
    abortRef.current = controller;
    clearError();
    setPhase("importing");
    captureEvent("account_settings:import_start");

    const timeoutId = window.setTimeout(() => {
      abortReasonRef.current = "timeout";
      controller.abort();
    }, IMPORT_CLIENT_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await importMutation.mutateAsync({ formData, signal: controller.signal });
      const result = response.importResult;
      setInsertedPeople(result.people.inserted);
      setInsertedGroups(result.groups.inserted);
      setInsertedTags(result.tags.inserted);
      setInsertedInteractions(result.interactions.inserted);
      const settingsData = settingsQuery.data?.data as
        | { importCompletedAt?: string | null }
        | undefined;
      const isFirstImport = settingsData?.importCompletedAt == null;
      captureImportComplete("bondery_export", result.people.inserted, isFirstImport);
      setPhase("finished");
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") {
        if (abortReasonRef.current === "timeout") {
          setError("timeout", t("TimeoutBody"));
          captureEvent("account_settings:import_fail", { error_code: "timeout" });
          setPhase("review");
        }
        return;
      }

      const errorCode = caught instanceof ApiError ? caught.code : "import_bondery_failed";
      setError("api", getUserFacingError(caught, tCommon));
      captureEvent("account_settings:import_fail", { error_code: errorCode });
      setPhase("review");
    } finally {
      window.clearTimeout(timeoutId);
      abortRef.current = null;
    }
  };

  const errorTitle = errorKind === "timeout" ? t("TimeoutTitle") : t("ErrorTitle");
  const errorBody = errorKind === "timeout" ? t("TimeoutBody") : (errorMessage ?? t("ErrorBody"));

  if (phase === "intro") {
    return renderWithNavigationProgress(
      <ImportIntroStep
        cancelLabel={tCommon("actions.cancel")}
        continueLabel={t("Continue")}
        descriptions={[t("IntroDescription1"), t("IntroDescription2"), t("IntroDescription3")]}
        icon={IconDatabaseImport}
        iconColor="violet"
        introTitle={t("IntroTitle")}
        onCancel={closeModal}
        onContinue={() => setPhase("upload")}
      />,
    );
  }

  if (isChecking || isImporting) {
    return renderWithNavigationProgress(
      <Stack aria-busy="true" gap="md">
        <ImportProcessingStep
          description={isChecking ? t("CheckingBody") : t("ImportingBody")}
          message={isChecking ? t("CheckingTitle") : t("ImportingTitle")}
        />
        <ModalFooter cancelLabel={tCommon("actions.cancel")} onCancel={handleCancel} />
      </Stack>,
    );
  }

  if (phase === "finished") {
    return renderWithNavigationProgress(
      <Stack gap="md">
        <Text fw={500}>{zeroInserts ? t("FinishedUpToDate") : t("FinishedTitle")}</Text>
        {zeroInserts ? null : <Text size="sm">{t("FinishedBody")}</Text>}
        <Group gap="xs" wrap="wrap">
          <CountChip
            color="blue"
            disabled={insertedPeople === 0}
            icon={<IconUser size={14} stroke={1.5} />}
            label={t("CountPeople", { count: insertedPeople })}
          >
            {t("CountPeople", { count: insertedPeople })}
          </CountChip>
          <CountChip
            color="teal"
            disabled={insertedGroups === 0}
            icon={<IconUsersGroup size={14} stroke={1.5} />}
            label={t("CountGroups", { count: insertedGroups })}
          >
            {t("CountGroups", { count: insertedGroups })}
          </CountChip>
          <CountChip
            color="yellow"
            disabled={insertedTags === 0}
            icon={<IconTag size={14} stroke={1.5} />}
            label={t("CountTags", { count: insertedTags })}
          >
            {t("CountTags", { count: insertedTags })}
          </CountChip>
          <CountChip
            color="green"
            disabled={insertedInteractions === 0}
            icon={<IconTimelineEventText size={14} stroke={1.5} />}
            label={t("CountInteractions", { count: insertedInteractions })}
          >
            {t("CountInteractions", { count: insertedInteractions })}
          </CountChip>
        </Group>
        <ModalFooter actionLabel={t("Done")} onAction={closeModal} />
      </Stack>,
    );
  }

  if (phase === "review") {
    const people = fileCounts?.people ?? 0;
    const groups = fileCounts?.groups ?? 0;
    const tags = fileCounts?.tags ?? 0;
    const interactions = fileCounts?.interactions ?? 0;

    return renderWithNavigationProgress(
      <Stack gap="md">
        {showReviewError ? (
          <Alert
            color="red"
            icon={<IconAlertCircle size={16} />}
            title={errorTitle}
            variant="light"
          >
            {errorBody}
          </Alert>
        ) : null}

        <Text size="sm">{fileIsEmpty ? t("ReviewEmpty") : t("ReviewIntro")}</Text>
        <Group gap="xs" wrap="wrap">
          <CountChip
            color="blue"
            disabled={people === 0}
            icon={<IconUser size={14} stroke={1.5} />}
            label={t("CountPeople", { count: people })}
          >
            {t("CountPeople", { count: people })}
          </CountChip>
          <CountChip
            color="teal"
            disabled={groups === 0}
            icon={<IconUsersGroup size={14} stroke={1.5} />}
            label={t("CountGroups", { count: groups })}
          >
            {t("CountGroups", { count: groups })}
          </CountChip>
          <CountChip
            color="yellow"
            disabled={tags === 0}
            icon={<IconTag size={14} stroke={1.5} />}
            label={t("CountTags", { count: tags })}
          >
            {t("CountTags", { count: tags })}
          </CountChip>
          <CountChip
            color="green"
            disabled={interactions === 0}
            icon={<IconTimelineEventText size={14} stroke={1.5} />}
            label={t("CountInteractions", { count: interactions })}
          >
            {t("CountInteractions", { count: interactions })}
          </CountChip>
        </Group>
        <ModalFooter
          actionDisabled={fileIsEmpty}
          actionLabel={t("ImportAction")}
          actionLeftSection={<IconDatabaseImport size={16} />}
          backLabel={tCommon("actions.back")}
          cancelLabel={tCommon("actions.cancel")}
          onAction={() => {
            void handleImport();
          }}
          onBack={() => {
            clearError();
            setFileCounts(null);
            fileRef.current = null;
            setPhase("upload");
          }}
          onCancel={handleCancel}
        />
      </Stack>,
    );
  }

  return renderWithNavigationProgress(
    <ImportZipUploadStep
      accept={IMPORT_ZIP_ACCEPT}
      backLabel={tCommon("actions.back")}
      cancelLabel={tCommon("actions.cancel")}
      dropzoneDescription={t("DropzoneDescription")}
      dropzoneTitle={t("DropzoneTitle")}
      header={
        showUploadError ? (
          <Alert
            color="red"
            icon={<IconAlertCircle size={16} />}
            title={errorTitle}
            variant="light"
          >
            {errorBody}
          </Alert>
        ) : null
      }
      maxSize={IMPORT_MAX_ZIP_BYTES}
      onBack={() => {
        clearError();
        setPhase("intro");
      }}
      onCancel={handleCancel}
      onDrop={handleDrop}
      onReject={handleReject}
      onSelectFile={() => openRef.current?.()}
      openRef={openRef}
      selectZipFileLabel={t("SelectFile")}
    />,
  );
}
