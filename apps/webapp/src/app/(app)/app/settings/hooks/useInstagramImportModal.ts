"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type { InstagramImportStrategy, InstagramPreparedContact } from "@bondery/schemas";
import { SOCIAL_IMPORT_COMMIT_BATCH_SIZE } from "@bondery/schemas/constants";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useModalDismiss } from "@/lib/modals";
import {
  useCommitInstagramImportMutation,
  useParseInstagramImportMutation,
} from "@/lib/query/hooks/useImports";
import { useUpdateImportFollowupMutation } from "@/lib/query/hooks/useSettings";
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
  const router = useRouter();
  const parseImport = useParseInstagramImportMutation();
  const commitImport = useCommitInstagramImportMutation();
  const followupMutation = useUpdateImportFollowupMutation();

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

  const importStrategyOptions = useMemo(
    () => [
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
    ],
    [t],
  );

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
  const openRef = useRef<() => void>(null);

  const previewContacts = useMemo(
    () => parsedContacts.filter((contact) => contact.isValid).map(toInstagramPreviewContact),
    [parsedContacts],
  );

  const validContactsCount = useMemo(
    () => parsedContacts.filter((contact) => contact.isValid).length,
    [parsedContacts],
  );

  const invalidContactsCount = parsedContacts.length - validContactsCount;
  const alreadyExistsCount = useMemo(
    () => parsedContacts.filter((contact) => contact.alreadyExists).length,
    [parsedContacts],
  );
  const likelyInfluencersCount = useMemo(
    () => parsedContacts.filter((contact) => !contact.likelyPerson).length,
    [parsedContacts],
  );
  const nonSelectableIds = useMemo(
    () =>
      new Set(
        parsedContacts.filter((contact) => contact.alreadyExists).map((contact) => contact.tempId),
      ),
    [parsedContacts],
  );
  const selectableIds = useMemo(
    () => previewContacts.map((contact) => contact.id).filter((id) => !nonSelectableIds.has(id)),
    [previewContacts, nonSelectableIds],
  );

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
    if (files.length !== 1) {
      notifications.show(
        errorNotificationTemplate({
          description: t("ZipTooManyFiles"),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    handleZipSelected(files[0]);
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

      notifications.show(
        successNotificationTemplate({
          description: t("ImportSuccess", {
            imported: totalImported,
            skipped: totalSkipped,
            updated: totalUpdated,
          }),
          title: t("SuccessTitle"),
        }),
      );

      closeModal();

      if (onSuccess) {
        onSuccess({
          imported: totalImported,
          skipped: totalSkipped,
          updated: totalUpdated,
        });
      } else {
        router.push(WEBAPP_ROUTES.PEOPLE);
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
    handleImport,
    handleRequestedExport,
    handleToggleAll,
    handleToggleOne,
    handleZipDrop,
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
