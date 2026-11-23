"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { InstagramImportStrategy, InstagramPreparedContact } from "@bondery/schemas";
import { SOCIAL_IMPORT_COMMIT_BATCH_SIZE } from "@bondery/schemas/constants";
import { notifications } from "@mantine/notifications";
import { useRef, useState } from "react";
import { captureImportComplete } from "@/lib/analytics/imports";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useModalDismiss } from "@/lib/modals";
import {
  useCommitInstagramImportMutation,
  useParseInstagramImportMutation,
} from "@/lib/query/hooks/useImports";
import { useSettingsQuery, useUpdateImportFollowupMutation } from "@/lib/query/hooks/useSettings";
import {
  INSTAGRAM_STEP_PROGRESS,
  type InstagramImportStep,
  readNumberField,
  sortInstagramContactsForPreview,
  toInstagramPreviewContact,
  validateInstagramZipFile,
  type ZipValidationErrorCode,
} from "../utils/instagram-import-helpers";
import { useImportContactSelection } from "./useImportContactSelection";
import { useImporterNavigationProgress } from "./useImporterNavigationProgress";

interface UseInstagramImportModalParams {
  initialStep?: InstagramImportStep;
  modalId: string;
  onAwaitingExport?: () => void | Promise<void>;
  onSuccess?: (stats: { imported: number; updated: number; skipped: number }) => void;
}

export function useInstagramImportModal({
  modalId,
  onSuccess,
  initialStep = "intro",
  onAwaitingExport,
}: UseInstagramImportModalParams) {
  const tCommon = useCommonTranslations();
  const t = useSettingsPageTranslations("DataManagement.InstagramImport");
  const parseImport = useParseInstagramImportMutation();
  const commitImport = useCommitInstagramImportMutation();
  const followupMutation = useUpdateImportFollowupMutation();
  const { data: settingsResult } = useSettingsQuery();

  const zipValidationMessage = (code: ZipValidationErrorCode): string => {
    switch (code) {
      case "no-file":
        return t("ZipNoFile");
      case "file-too-large":
        return t("ZipTooLarge");
      case "invalid-extension":
        return t("ZipInvalidExtension");
      case "invalid-mime":
        return t("ZipInvalidMime");
      default:
        return t("InvalidFile");
    }
  };

  const importStrategyOptions = [
    { label: t("StrategyCloseFriends"), value: "close_friends" as const },
    { label: t("StrategyFollowing"), value: "following" as const },
    { label: t("StrategyFollowers"), value: "followers" as const },
    {
      label: t("StrategyFollowingAndFollowers"),
      value: "following_and_followers" as const,
    },
    {
      label: t("StrategyMutualFollowing"),
      value: "mutual_following" as const,
    },
  ];

  const [step, setStep] = useState<InstagramImportStep>(initialStep);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [uploadedZip, setUploadedZip] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<InstagramImportStrategy>("following_and_followers");
  const [parsedContacts, setParsedContacts] = useState<InstagramPreparedContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [finishedStats, setFinishedStats] = useState<{
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const openRef = useRef<(() => void) | null>(null);

  const previewContacts = parsedContacts
    .filter((contact) => contact.isValid)
    .map(toInstagramPreviewContact);

  const importedContacts = previewContacts.filter((contact) => selectedIds.has(contact.id));

  const validContactsCount = parsedContacts.filter((contact) => contact.isValid).length;

  const invalidContactsCount = parsedContacts.length - validContactsCount;
  const alreadyExistsCount = parsedContacts.filter((contact) => contact.alreadyExists).length;
  const likelyInfluencersCount = parsedContacts.filter((contact) => !contact.likelyPerson).length;
  const nonSelectableIds = new Set(
    parsedContacts.filter((contact) => contact.alreadyExists).map((contact) => contact.tempId),
  );
  const selectableIds = previewContacts
    .map((contact) => contact.id)
    .filter((id) => !nonSelectableIds.has(id));

  const { allSelected, someSelected, handleToggleAll, handleToggleOne, resetSelectionAnchor } =
    useImportContactSelection({
      nonSelectableIds,
      previewContacts,
      selectableIds,
      selectedIds,
      setSelectedIds,
    });

  useImporterNavigationProgress({
    importProgress,
    step,
    stepProgress: INSTAGRAM_STEP_PROGRESS,
  });

  const isBlocking = isParsing || isImporting || step === "processing";
  const { closeModal } = useModalDismiss(modalId, isBlocking);
  const isOnboardingFlow = Boolean(onAwaitingExport);

  const handleRequestedExport = async () => {
    if (onAwaitingExport) {
      await onAwaitingExport();
    } else {
      await followupMutation.mutateAsync({
        platform: "instagram",
        status: "awaiting_export",
      });
    }
    closeModal();
  };

  const handleZipSelected = (file: File | null) => {
    const validation = validateInstagramZipFile(file);

    if (!validation.valid) {
      notifications.show(
        errorNotificationTemplate({
          description: zipValidationMessage(validation.code),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    setUploadedZip(validation.file);
    setStep("strategy");
  };

  const handleZipDrop = (files: File[]) => {
    const [file] = files;
    if (files.length !== 1 || !file) {
      notifications.show(
        errorNotificationTemplate({
          description: t("ZipTooManyFiles"),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    handleZipSelected(file);
  };

  const parseUpload = async () => {
    if (!uploadedZip) {
      notifications.show({
        color: "yellow",
        message: t("MissingUpload"),
        title: t("ErrorTitle"),
      });
      return;
    }

    setIsParsing(true);
    setStep("processing");

    const formData = new FormData();
    formData.append("files", uploadedZip, uploadedZip.name);
    formData.append("strategy", strategy);

    try {
      const data = await parseImport.mutateAsync(formData);
      const contacts = (data?.contacts || []) as InstagramPreparedContact[];
      const sortedContacts = sortInstagramContactsForPreview(contacts);

      setParsedContacts(sortedContacts);
      resetSelectionAnchor();
      setSelectedIds(
        new Set(
          sortedContacts
            .filter((item) => item.isValid && item.likelyPerson && !item.alreadyExists)
            .map((item) => item.tempId),
        ),
      );
      setStep("preview");
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
      setStep("strategy");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    const selectedContacts = parsedContacts.filter((contact) => selectedIds.has(contact.tempId));

    if (selectedContacts.length === 0) {
      notifications.show({
        color: "yellow",
        message: t("NoContactsSelected"),
        title: t("ErrorTitle"),
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedContacts.length });
    const isFirstImport =
      settingsResult?.data?.importCompletedAt === null ||
      settingsResult?.data?.importCompletedAt === undefined;

    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    try {
      const batchSize = SOCIAL_IMPORT_COMMIT_BATCH_SIZE;
      for (let i = 0; i < selectedContacts.length; i += batchSize) {
        const batch = selectedContacts.slice(i, i + batchSize);
        const isLastBatch = i + batchSize >= selectedContacts.length;

        const data = await commitImport.mutateAsync({
          body: { contacts: batch },
          finalize: isLastBatch,
        });

        totalImported += readNumberField(data, "importedCount");
        totalUpdated += readNumberField(data, "updatedCount");
        totalSkipped += readNumberField(data, "skippedCount");

        setImportProgress({
          current: Math.min(i + batchSize, selectedContacts.length),
          total: selectedContacts.length,
        });
      }

      captureImportComplete("instagram", totalImported + totalUpdated, isFirstImport);

      if (onSuccess) {
        closeModal();
        onSuccess({
          imported: totalImported,
          skipped: totalSkipped,
          updated: totalUpdated,
        });
      } else {
        setFinishedStats({
          imported: totalImported,
          skipped: totalSkipped,
          updated: totalUpdated,
        });
        setStep("finished");
      }
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return {
    allSelected,
    alreadyExistsCount,
    closeModal,
    finishedStats,
    handleImport,
    handleRequestedExport,
    handleToggleAll,
    handleToggleOne,
    handleZipDrop,
    importedContacts,
    importProgress,
    importStrategyOptions,
    invalidContactsCount,
    isImporting,
    isOnboardingFlow,
    isParsing,
    likelyInfluencersCount,
    nonSelectableIds,
    openRef,
    parsedContacts,
    parseUpload,
    previewContacts,
    selectedIds,
    setStep,
    setStrategy,
    someSelected,
    step,
    strategy,
    t,
    validContactsCount,
  };
}
