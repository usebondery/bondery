"use client";

import { errorNotificationTemplate, ModalTitle } from "@bondery/mantine-next";
import { Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { IconBrandInstagram } from "@tabler/icons-react";
import type { JSX } from "react";
import { useEffect } from "react";
import { useInstagramImportModal } from "../../hooks/useInstagramImportModal";
import type { InstagramImportStep } from "../utils/instagram-import-helpers";
import { ImportProcessingStep, ImportProgressStep } from "./import/ImportModalProcessingSteps";
import { InstagramImportInstructionsStep } from "./import/InstagramImportInstructionsStep";
import { InstagramImportIntroStep } from "./import/InstagramImportIntroStep";
import { InstagramImportPreviewStep } from "./import/InstagramImportPreviewStep";
import { InstagramImportStrategyStep } from "./import/InstagramImportStrategyStep";
import { InstagramImportUploadStep } from "./import/InstagramImportUploadStep";

export type { InstagramImportStep };

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
    parseUpload,
    parsedContacts,
    previewContacts,
    selectedIds,
    setStep,
    setStrategy,
    someSelected,
    step,
    strategy,
    t,
    validContactsCount,
  } = useInstagramImportModal({ initialStep, modalId, onAwaitingExport, onSuccess });

  const renderWithNavigationProgress = (content: JSX.Element) => (
    <>
      {showNavigationProgress ? <NavigationProgress /> : null}
      {content}
    </>
  );

  useEffect(() => {
    modals.updateModal({
      modalId,
      size: "lg",
      title: (
        <ModalTitle icon={<IconBrandInstagram size={20} stroke={1.5} />} text={t("ModalTitle")} />
      ),
    });
  }, [modalId, t]);

  if (step === "intro") {
    return renderWithNavigationProgress(
      <InstagramImportIntroStep
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
            void handleRequestedExport();
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
              <Stack gap={2} pl="xs">
                <Text c="dimmed" size="sm">
                  ? {t("InstructionStep5")}
                </Text>
                <Text c="dimmed" size="sm">
                  ? {t("InstructionStep6")}
                </Text>
              </Stack>
            </Stack>
          ),
          number: 4,
        }}
      />,
    );
  }

  if (step === "upload") {
    return renderWithNavigationProgress(
      <InstagramImportUploadStep
        backLabel={t("Back")}
        cancelLabel={t("Cancel")}
        dropzoneDescription={t("DropzoneDescription")}
        dropzoneTitle={t("DropzoneTitle")}
        isParsing={isParsing}
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
          void parseUpload();
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

  return renderWithNavigationProgress(
    <InstagramImportPreviewStep
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
        likelyBusiness: t("LikelyBusinessAndInfluencers", {
          count: likelyInfluencersCount,
        }),
        total: t("Total", { count: parsedContacts.length }),
        valid: t("Valid", { count: validContactsCount }),
      }}
      likelyInfluencersCount={likelyInfluencersCount}
      noContactsFound={t("NoContactsFound")}
      noContactsMatchSearch={t("NoContactsMatchSearch")}
      nonSelectableIds={nonSelectableIds}
      onBack={() => setStep("strategy")}
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
