"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { detachPromise } from "@bondery/helpers/async";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  DropzoneContent,
  errorNotificationTemplate,
  ModalFooter,
  ModalTitle,
  warningNotificationTemplate,
} from "@bondery/mantine-next";
import type { VCardPreparedContact } from "@bondery/schemas";
import { VCARD_IMPORT_COMMIT_BATCH_SIZE } from "@bondery/schemas/constants";
import {
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import {
  IconAddressBook,
  IconArrowLeft,
  IconArrowRight,
  IconDeviceMobile,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { captureImportComplete } from "@/lib/analytics/imports";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useModalDismiss } from "@/lib/modals";
import { routeAssert } from "@/lib/navigation/route/assert";
import {
  useCommitVCardImportMutation,
  useParseVCardImportMutation,
} from "@/lib/query/hooks/useImports";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { useImporterNavigationProgress } from "../../hooks/useImporterNavigationProgress";
import { ImportFinishedStep } from "../import/ImportFinishedStep";
import { ImportIntroStep } from "../import/ImportIntroStep";
import { VCardImportPreviewStep } from "../import/VCardImportPreviewStep";

type Step = "intro" | "instructions" | "upload" | "processing" | "preview" | "finished";

const STEP_PROGRESS: Record<Step, number> = {
  finished: 100,
  instructions: 30,
  intro: 12,
  preview: 84,
  processing: 68,
  upload: 50,
};

function sortVCardContactsForPreview(contacts: VCardPreparedContact[]): VCardPreparedContact[] {
  return contacts
    .map((contact, index) => ({ contact, index }))
    .sort((left, right) => {
      const leftRank = left.contact.isValid ? 0 : 1;
      const rightRank = right.contact.isValid ? 0 : 1;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.contact);
}

export function VCardImportModal({
  modalId,
  showNavigationProgress = true,
}: {
  modalId: string;
  showNavigationProgress?: boolean;
}) {
  const tCommon = useCommonTranslations();
  const t = useSettingsPageTranslations("DataManagement.VCardImport");
  const router = useRouter();
  const parseImport = useParseVCardImportMutation();
  const commitImport = useCommitVCardImportMutation();
  const { data: settingsResult } = useSettingsQuery();
  const [step, setStep] = useState<Step>("intro");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [parsedContacts, setParsedContacts] = useState<VCardPreparedContact[]>([]);
  const [finishedStats, setFinishedStats] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const openRef = useRef<(() => void) | null>(null);

  /**
   * Every valid contact. Nothing is selectable in the preview, so this is also what the import
   * commits.
   */
  const importableContacts = parsedContacts.filter((contact) => contact.isValid);

  const previewPeople = importableContacts.map((contact) => ({
    avatar: contact.avatarUri,
    firstName: contact.firstName,
    id: contact.tempId,
    lastName: contact.lastName,
  }));

  useImporterNavigationProgress({
    importProgress,
    step,
    stepProgress: STEP_PROGRESS,
  });

  const renderWithNavigationProgress = (content: JSX.Element) => (
    <>
      {showNavigationProgress ? <NavigationProgress /> : null}
      {content}
    </>
  );

  const isBlocking = isParsing || isImporting || step === "processing";
  const { closeModal } = useModalDismiss(modalId, isBlocking);

  useEffect(() => {
    modals.updateModal({
      modalId,
      // Every import step fits the same width, so the flow does not resize between steps.
      size: "lg",
      title: (
        <ModalTitle icon={<IconAddressBook size={20} stroke={1.5} />} text={t("ModalTitle")} />
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
      formData.append("files", file, file.name);
    }

    try {
      const result = await parseImport.mutateAsync(formData);

      const contacts = (result.contacts || []) as VCardPreparedContact[];
      setParsedContacts(sortVCardContactsForPreview(contacts));
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
      notifications.show(
        warningNotificationTemplate({
          description: t("NoContactsSelected"),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: importableContacts.length });
    const isFirstImport =
      settingsResult?.data?.importCompletedAt === null ||
      settingsResult?.data?.importCompletedAt === undefined;

    let totalImported = 0;
    let totalSkipped = 0;

    try {
      const batchSize = VCARD_IMPORT_COMMIT_BATCH_SIZE;
      for (let i = 0; i < importableContacts.length; i += batchSize) {
        const batch = importableContacts.slice(i, i + batchSize);
        const isLastBatch = i + batchSize >= importableContacts.length;

        const result = await commitImport.mutateAsync({
          body: { contacts: batch },
          finalize: isLastBatch,
        });

        totalImported += result.importedCount ?? 0;
        totalSkipped += result.skippedCount ?? 0;

        setImportProgress({
          current: Math.min(i + batchSize, importableContacts.length),
          total: importableContacts.length,
        });
      }

      captureImportComplete("vcard", totalImported, isFirstImport);

      setFinishedStats({ imported: totalImported, skipped: totalSkipped });
      setStep("finished");
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
        icon={IconDeviceMobile}
        iconColor="green"
        introTitle={t("IntroTitle")}
        onCancel={closeModal}
        onContinue={() => setStep("instructions")}
      />,
    );
  }

  if (step === "instructions") {
    return renderWithNavigationProgress(
      <Stack gap="md">
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Text fw={600} size="sm" ta="center">
              {t("InstructionsTitle")}
            </Text>
            <Divider />
            {[
              { number: 1, step: t("InstructionStep1") },
              { number: 2, step: t("InstructionStep2") },
              { number: 3, step: t("InstructionStep3") },
              { number: 4, step: t("InstructionStep4") },
            ].map(({ step: instruction, number }) => (
              <Group align="center" gap="sm" key={instruction} wrap="nowrap">
                <ThemeIcon
                  color="green"
                  radius="xl"
                  size={22}
                  style={{ flexShrink: 0 }}
                  variant="filled"
                >
                  <Text component="span" fw={700} lh={1} size="xs">
                    {number}
                  </Text>
                </ThemeIcon>
                <Text size="sm">{instruction}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>

        <ModalFooter
          actionLabel={t("HaveVcfFile")}
          actionRightSection={<IconArrowRight size={16} />}
          backLabel={t("Back")}
          backLeftSection={<IconArrowLeft size={16} />}
          cancelLabel={t("Cancel")}
          onAction={() => setStep("upload")}
          onBack={() => setStep("intro")}
          onCancel={closeModal}
        />
      </Stack>,
    );
  }

  if (step === "upload") {
    return renderWithNavigationProgress(
      <Stack gap="md">
        <Dropzone
          accept={{
            "application/octet-stream": [".vcf"],
            "text/directory": [".vcf"],
            "text/vcard": [".vcf"],
            "text/x-vcard": [".vcf"],
          }}
          loading={isParsing}
          maxFiles={1}
          maxSize={30 * 1024 * 1024}
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
          openRef={openRef}
        >
          <DropzoneContent description={t("DropzoneDescription")} title={t("DropzoneTitle")} />
        </Dropzone>

        <ModalFooter
          actionLabel={t("SelectVcfFile")}
          actionLeftSection={<IconAddressBook size={16} />}
          backLabel={t("Back")}
          backLeftSection={<IconArrowLeft size={16} />}
          cancelLabel={t("Cancel")}
          onAction={() => openRef.current?.()}
          onBack={() => setStep("instructions")}
          onCancel={closeModal}
        />
      </Stack>,
    );
  }

  if (step === "processing") {
    return renderWithNavigationProgress(
      <Stack gap="lg" py="md">
        <Center>
          <Stack align="center" gap="sm">
            <Loader size="md" />
            <Text>{t("ProcessingContacts")}</Text>
          </Stack>
        </Center>
      </Stack>,
    );
  }

  if (isImporting && importProgress !== null) {
    const percentage = Math.round((importProgress.current / importProgress.total) * 100);
    return renderWithNavigationProgress(
      <Stack gap="lg" py="md">
        <Center>
          <Stack align="center" gap="md" maw={400} w="100%">
            <Text fw={600}>{t("ImportingTitle")}</Text>
            <Progress size="lg" value={percentage} w="100%" />
            <Text c="dimmed" size="sm">
              {t("ImportingProgress", {
                current: importProgress.current,
                total: importProgress.total,
              })}
            </Text>
          </Stack>
        </Center>
      </Stack>,
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
    <VCardImportPreviewStep
      backLabel={t("Back")}
      cancelLabel={t("Cancel")}
      counts={[
        { label: t("TotalLabel"), value: parsedContacts.length },
        { isPrimary: true, label: t("WillAddLabel"), value: importableContacts.length },
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
