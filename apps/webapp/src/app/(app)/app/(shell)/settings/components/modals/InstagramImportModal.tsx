"use client";

import { detachPromise } from "@bondery/helpers/async";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate, ModalTitle } from "@bondery/mantine-next";
import { List, ListItem, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { IconBrandInstagram } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useEffect } from "react";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { routeAssert } from "@/lib/navigation/route/assert";
import { useInstagramImportModal } from "../../hooks/useInstagramImportModal";
import {
  INSTAGRAM_MAX_FILE_SIZE_BYTES,
  type InstagramImportStep,
} from "../../utils/instagram-import-helpers";
import { ImportFinishedStep } from "../import/ImportFinishedStep";
import { ImportIntroStep } from "../import/ImportIntroStep";
import { IMPORT_ZIP_ACCEPT, ImportZipUploadStep } from "../import/ImportZipUploadStep";
import { InstagramImportInstructionsStep } from "../import/InstagramImportInstructionsStep";
import { InstagramImportPreviewStep } from "../import/InstagramImportPreviewStep";
import { InstagramImportStrategyStep } from "../import/InstagramImportStrategyStep";
import { ImportProcessingStep, ImportProgressStep } from "../import/importModalProcessingSteps";

export type { InstagramImportStep } from "../../utils/instagram-import-helpers";

export function InstagramImportModal({
  modalId,
  onSuccess,
  showNavigationProgress = true,
  initialStep = "intro",
  onAwaitingExport,
}: {
  modalId: string;
  onSuccess?: (stats: { imported: number; updated: number; skipped: number }) => void;
  showNavigationProgress?: boolean;
  initialStep?: InstagramImportStep;
  onAwaitingExport?: () => void | Promise<void>;
}) {
  const {
    alreadyExistsCount,
    closeModal,
    finishedStats,
    handleImport,
    handleRequestedExport,
    handleZipDrop,
    importProgress,
    importStrategyOptions,
    importableCount,
    isImporting,
    isOnboardingFlow,
    isParsing,
    openRef,
    parseUpload,
    parsedContacts,
    previewPeople,
    setStep,
    setStrategy,
    step,
    strategy,
    t,
  } = useInstagramImportModal({ initialStep, modalId, onAwaitingExport, onSuccess });

  const tCommon = useCommonTranslations();
  const router = useRouter();

  const renderWithNavigationProgress = (content: JSX.Element) => (
    <>
      {showNavigationProgress ? <NavigationProgress /> : null}
      {content}
    </>
  );

  useEffect(() => {
    modals.updateModal({
      modalId,
      // One width for every step, like the other import flows. A wider finished step made this
      // dialog resize between steps while the rest of the settings modals stayed `lg`.
      size: "lg",
      title: (
        <ModalTitle icon={<IconBrandInstagram size={20} stroke={1.5} />} text={t("ModalTitle")} />
      ),
    });
  }, [modalId, t]);

  if (step === "intro") {
    return renderWithNavigationProgress(
      <ImportIntroStep
        cancelLabel={t("Cancel")}
        continueLabel={t("Continue")}
        descriptions={[t("IntroDescription1"), t("IntroDescription2"), t("IntroDescription3")]}
        icon={IconBrandInstagram}
        iconColor="pink"
        introTitle={t("IntroTitle")}
        onCancel={closeModal}
        onContinue={() => setStep("instructions")}
      />,
    );
  }

  if (step === "instructions") {
    return renderWithNavigationProgress(
      <InstagramImportInstructionsStep
        actionLabel={isOnboardingFlow ? t("RequestedExport") : t("HaveZipFile")}
        backLabel={t("Back")}
        cancelLabel={isOnboardingFlow ? t("HaveZipFile") : undefined}
        filesAlertDescriptionPrefix={t("FilesAlertDescriptionPrefix")}
        filesAlertDescriptionSuffix={t("FilesAlertDescriptionSuffix")}
        filesAlertFilesBold={t("FilesAlertFilesBold")}
        filesAlertTitle={t("FilesAlertTitle")}
        instructionStep1LinkHref="https://accountscenter.instagram.com/info_and_permissions/dyi/"
        instructionStep1LinkLabel={t("InstructionStep1LinkLabel")}
        instructionStep1Prefix={t("InstructionStep1Prefix")}
        instructionsTitle={t("InstructionsTitle")}
        isOnboardingFlow={isOnboardingFlow}
        numberedSteps={[
          { number: 2, text: t("InstructionStep2") },
          { number: 3, text: t("InstructionStep3") },
          { number: 5, text: t("InstructionStep8") },
          { number: 6, text: t("InstructionStep10") },
          { number: 7, text: t("InstructionStep11") },
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
        specialStep={{
          content: (
            <Stack gap={4}>
              <Text size="sm">{t("InstructionStep4")}</Text>
              <List c="dimmed" pl="xs" size="sm" spacing={2}>
                <ListItem>{t("InstructionStep5")}</ListItem>
                <ListItem>{t("InstructionStep6")}</ListItem>
              </List>
            </Stack>
          ),
          number: 4,
        }}
      />,
    );
  }

  if (step === "upload") {
    return renderWithNavigationProgress(
      <ImportZipUploadStep
        accept={IMPORT_ZIP_ACCEPT}
        backLabel={t("Back")}
        cancelLabel={t("Cancel")}
        dropzoneDescription={t("DropzoneDescription")}
        dropzoneTitle={t("DropzoneTitle")}
        loading={isParsing}
        maxSize={INSTAGRAM_MAX_FILE_SIZE_BYTES}
        onBack={() => setStep("instructions")}
        onCancel={closeModal}
        onDrop={handleZipDrop}
        onReject={(rejections) => {
          const firstError = rejections[0]?.errors?.[0];
          const rejectionMessage =
            firstError?.code === "file-too-large"
              ? t("ZipTooLarge")
              : firstError?.code === "too-many-files"
                ? t("ZipTooManyFiles")
                : firstError?.code === "file-invalid-type"
                  ? t("ZipInvalidType")
                  : firstError?.message || t("InvalidFile");
          notifications.show(
            errorNotificationTemplate({
              description: rejectionMessage,
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

  if (step === "strategy") {
    return renderWithNavigationProgress(
      <InstagramImportStrategyStep
        backLabel={t("Back")}
        cancelLabel={t("Cancel")}
        isParsing={isParsing}
        onBack={() => setStep("upload")}
        onCancel={closeModal}
        onParse={() => {
          detachPromise(parseUpload());
        }}
        onStrategyChange={setStrategy}
        parseUploadedLabel={t("ParseUploaded")}
        strategy={strategy}
        strategyHelpDescription={t("StrategyHelpDescription")}
        strategyHelpTitle={t("StrategyHelpTitle")}
        strategyLabel={t("StrategyLabel")}
        strategyOptions={importStrategyOptions}
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
        onViewContacts={() => {
          closeModal();
          router.push(routeAssert(WEBAPP_ROUTES.PEOPLE));
        }}
        title={t("SuccessTitle")}
        viewContactsLabel={tCommon("actions.viewContacts")}
      />,
    );
  }

  return renderWithNavigationProgress(
    <InstagramImportPreviewStep
      backLabel={t("Back")}
      cancelLabel={t("Cancel")}
      counts={[
        { label: t("TotalLabel"), value: parsedContacts.length },
        { isPrimary: true, label: t("WillAddLabel"), value: importableCount },
        ...(alreadyExistsCount > 0 ? [{ label: t("SkipLabel"), value: alreadyExistsCount }] : []),
      ]}
      description={t("PreviewDescription")}
      emptyLabel={t("NoContactsFound")}
      importLabel={t("ImportAction")}
      isImporting={isImporting}
      onBack={() => setStep("strategy")}
      onCancel={closeModal}
      onImport={() => {
        detachPromise(handleImport());
      }}
      people={previewPeople}
      peopleLabel={t("PeopleToAdd")}
      remainderLabel={
        importableCount > 10 ? t("AndMore", { count: importableCount - 10 }) : undefined
      }
    />,
  );
}
