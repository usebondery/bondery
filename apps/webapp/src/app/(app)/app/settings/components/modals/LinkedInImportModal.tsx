"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { LinkedInPreparedContact } from "@bondery/schemas";
import { SOCIAL_IMPORT_COMMIT_BATCH_SIZE } from "@bondery/schemas/constants";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { IconBrandLinkedin } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useModalDismiss } from "@/lib/modals";
import {
  useCommitLinkedInImportMutation,
  useParseLinkedInImportMutation,
} from "@/lib/query/hooks/useImports";
import { useUpdateImportFollowupMutation } from "@/lib/query/hooks/useSettings";
import { useImportContactSelection } from "../../hooks/useImportContactSelection";
import { useImporterNavigationProgress } from "../../hooks/useImporterNavigationProgress";
import {
  LINKEDIN_STEP_PROGRESS,
  type LinkedInImportStep,
  sortLinkedInContactsForPreview,
  toLinkedInPreviewContact,
} from "../../utils/linkedin-import-helpers";
import { ImportProcessingStep, ImportProgressStep } from "../import/ImportModalProcessingSteps";
import { LinkedInImportInstructionsStep } from "../import/LinkedInImportInstructionsStep";
import { LinkedInImportIntroStep } from "../import/LinkedInImportIntroStep";
import { LinkedInImportPreviewStep } from "../import/LinkedInImportPreviewStep";
import { LinkedInImportUploadStep } from "../import/LinkedInImportUploadStep";

export type { LinkedInImportStep };

export function LinkedInImportModal({
  modalId,
  onSuccess,
  showNavigationProgress = true,
  initialStep = "intro",
  onAwaitingExport,
}: {
  modalId: string;
  onSuccess?: (stats: { imported: number; updated: number; skipped: number }) => void;
  showNavigationProgress?: boolean;
  initialStep?: LinkedInImportStep;
  onAwaitingExport?: () => void | Promise<void>;
}) {
  const tCommon = useCommonTranslations();
  const t = useSettingsPageTranslations("DataManagement.LinkedInImport");
  const router = useRouter();
  const parseImport = useParseLinkedInImportMutation();
  const commitImport = useCommitLinkedInImportMutation();
  const followupMutation = useUpdateImportFollowupMutation();
  const [step, setStep] = useState<LinkedInImportStep>(initialStep);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [parsedContacts, setParsedContacts] = useState<LinkedInPreparedContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const openRef = useRef<() => void>(null);

  const previewContacts = useMemo(
    () => parsedContacts.filter((contact) => contact.isValid).map(toLinkedInPreviewContact),
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
    stepProgress: LINKEDIN_STEP_PROGRESS,
  });

  const renderWithNavigationProgress = (content: JSX.Element) => (
    <>
      {showNavigationProgress ? <NavigationProgress /> : null}
      {content}
    </>
  );

  const isBlocking = isParsing || isImporting || step === "processing";
  const { closeModal } = useModalDismiss(modalId, isBlocking);

  const isOnboardingFlow = Boolean(onAwaitingExport);

  const handleRequestedExport = async () => {
    if (onAwaitingExport) {
      await onAwaitingExport();
    } else {
      await followupMutation.mutateAsync({
        platform: "linkedin",
        status: "awaiting_export",
      });
    }
    closeModal();
  };

  useEffect(() => {
    modals.updateModal({
      modalId,
      size:
        step === "preview" && !isImporting
          ? "80rem"
          : step === "intro" ||
              step === "instructions" ||
              step === "upload" ||
              step === "processing" ||
              isImporting
            ? "lg"
            : "xl",
      title: (
        <ModalTitle icon={<IconBrandLinkedin size={20} stroke={1.5} />} text={t("ModalTitle")} />
      ),
    });
  }, [isImporting, modalId, step, t]);

  const parseUpload = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setIsParsing(true);
    setStep("processing");

    const formData = new FormData();
    files.forEach((file) => {
      const webkitFile = file as File & { webkitRelativePath?: string };
      formData.append("files", file, webkitFile.webkitRelativePath || file.name);
    });

    try {
      const result = await parseImport.mutateAsync(formData);

      const contacts = (result.contacts || []) as LinkedInPreparedContact[];
      const sortedContacts = sortLinkedInContactsForPreview(contacts);

      setParsedContacts(sortedContacts);
      resetSelectionAnchor();
      setSelectedIds(
        new Set(
          sortedContacts
            .filter((item) => item.isValid && !item.alreadyExists)
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
      setStep("upload");
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

        const result = await commitImport.mutateAsync({
          body: { contacts: batch },
          finalize: isLastBatch,
        });

        totalImported += result.importedCount ?? 0;
        totalUpdated += result.updatedCount ?? 0;
        totalSkipped += result.skippedCount ?? 0;

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

  if (step === "intro") {
    return renderWithNavigationProgress(
      <LinkedInImportIntroStep
        cancelLabel={t("Cancel")}
        continueLabel={t("Continue")}
        descriptions={[t("IntroDescription1"), t("IntroDescription2"), t("IntroDescription3")]}
        introTitle={t("IntroTitle")}
        onCancel={closeModal}
        onContinue={() => setStep("instructions")}
      />,
    );
  }

  if (step === "instructions") {
    return renderWithNavigationProgress(
      <LinkedInImportInstructionsStep
        actionLabel={isOnboardingFlow ? t("RequestedExport") : t("HaveZipFile")}
        backLabel={t("Back")}
        cancelLabel={isOnboardingFlow ? t("HaveZipFile") : undefined}
        filesAlertDescriptionPrefix={t("FilesAlertDescriptionPrefix")}
        filesAlertDescriptionSuffix={t("FilesAlertDescriptionSuffix")}
        filesAlertFileConnectionsBold={t("FilesAlertFileConnectionsBold")}
        filesAlertTitle={t("FilesAlertTitle")}
        instructionStep1LinkHref="https://www.linkedin.com/mypreferences/d/download-my-data"
        instructionStep1LinkLabel={t("InstructionStep1LinkLabel")}
        instructionStep1Prefix={t("InstructionStep1Prefix")}
        instructionsTitle={t("InstructionsTitle")}
        isOnboardingFlow={isOnboardingFlow}
        numberedSteps={[
          { number: 2, text: t("InstructionStep2") },
          { number: 3, text: t("InstructionStep3") },
          { number: 4, text: t("InstructionStep4") },
        ]}
        onAction={() => {
          if (isOnboardingFlow) {
            void handleRequestedExport();
          } else {
            setStep("upload");
          }
        }}
        onBack={() => setStep("intro")}
        onCancel={isOnboardingFlow ? () => setStep("upload") : undefined}
      />,
    );
  }

  if (step === "upload") {
    return renderWithNavigationProgress(
      <LinkedInImportUploadStep
        backLabel={t("Back")}
        cancelLabel={t("Cancel")}
        dropzoneDescription={t("DropzoneDescription")}
        dropzoneTitle={t("DropzoneTitle")}
        isParsing={isParsing}
        onBack={() => setStep("instructions")}
        onCancel={closeModal}
        onDrop={(files) => {
          void parseUpload(files);
        }}
        onReject={() => {
          notifications.show(
            errorNotificationTemplate({
              description: t("InvalidFile"),
              title: t("ErrorTitle"),
            }),
          );
        }}
        onSelectFile={() => openRef.current?.()}
        openRef={openRef}
        selectZipFileLabel={t("SelectZipFile")}
      />,
    );
  }

  if (step === "processing") {
    return renderWithNavigationProgress(
      <ImportProcessingStep message={t("ProcessingConnections")} />,
    );
  }

  if (isImporting && importProgress !== null) {
    return renderWithNavigationProgress(
      <ImportProgressStep
        current={importProgress.current}
        importingProgressLabel={t("ImportingProgress", {
          current: importProgress.current,
          total: importProgress.total,
        })}
        importingTitle={t("ImportingTitle")}
        total={importProgress.total}
      />,
    );
  }

  return renderWithNavigationProgress(
    <LinkedInImportPreviewStep
      allSelected={allSelected}
      alreadyExistsCount={alreadyExistsCount}
      backLabel={t("Back")}
      cancelLabel={t("Cancel")}
      chooseContactsHint={t("ChooseContactsHint")}
      existingHandleTooltip={t("ExistingHandleTooltip")}
      importSelectedLabel={t("ImportSelected", { count: selectedIds.size })}
      invalidContactsCount={invalidContactsCount}
      isImporting={isImporting}
      labels={{
        alreadyExists: t("AlreadyExists", { count: alreadyExistsCount }),
        invalid: t("Invalid", { count: invalidContactsCount }),
        total: t("Total", { count: parsedContacts.length }),
        valid: t("Valid", { count: validContactsCount }),
      }}
      noContactsFound={t("NoContactsFound")}
      noContactsMatchSearch={t("NoContactsMatchSearch")}
      nonSelectableIds={nonSelectableIds}
      onBack={() => setStep("upload")}
      onCancel={closeModal}
      onImport={() => {
        void handleImport();
      }}
      onSelectAll={handleToggleAll}
      onSelectOne={handleToggleOne}
      previewContacts={previewContacts}
      selectedIds={selectedIds}
      someSelected={someSelected}
    />,
  );
}
