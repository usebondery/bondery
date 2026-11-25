"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { detachPromise } from "@bondery/helpers/async";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate, ModalTitle } from "@bondery/mantine-next";
import type { LinkedInPreparedContact } from "@bondery/schemas";
import { SOCIAL_IMPORT_COMMIT_BATCH_SIZE } from "@bondery/schemas/constants";
import { MIME_TYPES } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { IconBrandLinkedin } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { captureImportComplete } from "@/lib/analytics/imports";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useModalDismiss } from "@/lib/modals";
import { routeAssert } from "@/lib/navigation/route/assert";
import {
  useCommitLinkedInImportMutation,
  useParseLinkedInImportMutation,
} from "@/lib/query/hooks/useImports";
import { useSettingsQuery, useUpdateImportFollowupMutation } from "@/lib/query/hooks/useSettings";
import { nonEmpty } from "@/lib/shared/nonEmpty";
import { useImporterNavigationProgress } from "../../hooks/useImporterNavigationProgress";
import {
  LINKEDIN_STEP_PROGRESS,
  type LinkedInImportStep,
  sortLinkedInContactsForPreview,
} from "../../utils/linkedin-import-helpers";
import { ImportFinishedStep } from "../import/ImportFinishedStep";
import { ImportIntroStep } from "../import/ImportIntroStep";
import { ImportZipUploadStep } from "../import/ImportZipUploadStep";
import { ImportProcessingStep, ImportProgressStep } from "../import/importModalProcessingSteps";
import { LinkedInImportInstructionsStep } from "../import/LinkedInImportInstructionsStep";
import { LinkedInImportPreviewStep } from "../import/LinkedInImportPreviewStep";

const LINKEDIN_MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const LINKEDIN_UPLOAD_ACCEPT = {
  [MIME_TYPES.csv]: [".csv"],
  [MIME_TYPES.zip]: [".zip"],
  "application/csv": [".csv"],
  "application/octet-stream": [".zip", ".csv"],
  "application/vnd.ms-excel": [".csv"],
  "application/x-zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "multipart/x-zip": [".zip"],
  "text/plain": [".csv"],
};

export type { LinkedInImportStep } from "../../utils/linkedin-import-helpers";

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
  const { data: settingsResult } = useSettingsQuery();
  const [step, setStep] = useState<LinkedInImportStep>(initialStep);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [parsedContacts, setParsedContacts] = useState<LinkedInPreparedContact[]>([]);
  const [finishedStats, setFinishedStats] = useState<{
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const openRef = useRef<(() => void) | null>(null);

  /**
   * Every contact that can be added. Nothing is selectable in the preview, so this is also what
   * the import commits.
   */
  const importableContacts = parsedContacts.filter(
    (contact) => contact.isValid && !contact.alreadyExists,
  );

  /** Chips only need a name, so map straight from prepared contacts. */
  const previewPeople = importableContacts.map((contact) => ({
    avatar: null,
    firstName: contact.firstName,
    id: contact.tempId,
    lastName: contact.lastName,
  }));

  const alreadyExistsCount = parsedContacts.filter((contact) => contact.alreadyExists).length;

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: step and isImporting are triggers: re-apply the modal chrome after each step change.
  useEffect(() => {
    modals.updateModal({
      modalId,
      // Every import step fits the same width, so the flow does not resize between steps.
      size: "lg",
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
    for (const file of files) {
      const webkitFile = file as File & { webkitRelativePath?: string };
      formData.append("files", file, nonEmpty(webkitFile.webkitRelativePath) ?? file.name);
    }

    try {
      const result = await parseImport.mutateAsync(formData);

      const contacts = (result.contacts || []) as LinkedInPreparedContact[];
      setParsedContacts(sortLinkedInContactsForPreview(contacts));
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
    if (importableContacts.length === 0) {
      notifications.show({
        color: "yellow",
        message: t("NoContactsSelected"),
        title: t("ErrorTitle"),
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: importableContacts.length });
    const isFirstImport =
      settingsResult?.data?.importCompletedAt === null ||
      settingsResult?.data?.importCompletedAt === undefined;

    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    try {
      const batchSize = SOCIAL_IMPORT_COMMIT_BATCH_SIZE;
      for (let i = 0; i < importableContacts.length; i += batchSize) {
        const batch = importableContacts.slice(i, i + batchSize);
        const isLastBatch = i + batchSize >= importableContacts.length;

        const result = await commitImport.mutateAsync({
          body: { contacts: batch },
          finalize: isLastBatch,
        });

        totalImported += result.importedCount ?? 0;
        totalUpdated += result.updatedCount ?? 0;
        totalSkipped += result.skippedCount ?? 0;

        setImportProgress({
          current: Math.min(i + batchSize, importableContacts.length),
          total: importableContacts.length,
        });
      }

      captureImportComplete("linkedin", totalImported + totalUpdated, isFirstImport);

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

  const handleViewContacts = () => {
    closeModal();
    router.push(routeAssert(WEBAPP_ROUTES.PEOPLE));
  };

  if (step === "intro") {
    return renderWithNavigationProgress(
      <ImportIntroStep
        cancelLabel={t("Cancel")}
        continueLabel={t("Continue")}
        descriptions={[t("IntroDescription1"), t("IntroDescription2"), t("IntroDescription3")]}
        icon={IconBrandLinkedin}
        iconColor="blue"
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
            detachPromise(handleRequestedExport());
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
      <ImportZipUploadStep
        accept={LINKEDIN_UPLOAD_ACCEPT}
        backLabel={t("Back")}
        cancelLabel={t("Cancel")}
        dropzoneDescription={t("DropzoneDescription")}
        dropzoneTitle={t("DropzoneTitle")}
        loading={isParsing}
        maxSize={LINKEDIN_MAX_UPLOAD_BYTES}
        onBack={() => setStep("instructions")}
        onCancel={closeModal}
        onDrop={(files) => {
          detachPromise(parseUpload(files));
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

  if (step === "finished") {
    return renderWithNavigationProgress(
      <ImportFinishedStep
        closeLabel={tCommon("a11y.close")}
        description={finishedStats ? t("ImportSuccess", finishedStats) : undefined}
        onClose={closeModal}
        onViewContacts={handleViewContacts}
        title={t("SuccessTitle")}
        viewContactsLabel={tCommon("actions.viewContacts")}
      />,
    );
  }

  return renderWithNavigationProgress(
    <LinkedInImportPreviewStep
      backLabel={t("Back")}
      cancelLabel={t("Cancel")}
      counts={[
        { label: t("TotalLabel"), value: parsedContacts.length },
        { isPrimary: true, label: t("WillAddLabel"), value: importableContacts.length },
        ...(alreadyExistsCount > 0 ? [{ label: t("SkipLabel"), value: alreadyExistsCount }] : []),
      ]}
      description={t("PreviewDescription")}
      emptyLabel={t("NoContactsFound")}
      importLabel={t("ImportAction")}
      isImporting={isImporting}
      onBack={() => setStep("upload")}
      onCancel={closeModal}
      onImport={() => {
        detachPromise(handleImport());
      }}
      people={previewPeople}
      peopleLabel={t("PeopleToAdd")}
      remainderLabel={
        importableContacts.length > 10
          ? t("AndMore", { count: importableContacts.length - 10 })
          : undefined
      }
    />,
  );
}
