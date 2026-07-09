"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  DropzoneContent,
  errorNotificationTemplate,
  ModalFooter,
  ModalScrollLayout,
  ModalTitle,
  successNotificationTemplate,
  warningNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact, VCardPreparedContact } from "@bondery/schemas";
import { VCARD_IMPORT_COMMIT_BATCH_SIZE } from "@bondery/schemas/constants";
import {
  Badge,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import {
  IconAddressBook,
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheck,
  IconDeviceMobile,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ContactsTable from "@/components/contacts/ContactsTableV2";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useModalDismiss } from "@/lib/modals";
import {
  useCommitVCardImportMutation,
  useParseVCardImportMutation,
} from "@/lib/query/hooks/useImports";
import { useImporterNavigationProgress } from "../../hooks/useImporterNavigationProgress";

type Step = "intro" | "instructions" | "upload" | "processing" | "preview";

const STEP_PROGRESS: Record<Step, number> = {
  instructions: 30,
  intro: 12,
  preview: 84,
  processing: 68,
  upload: 50,
};

function toPreviewContact(contact: VCardPreparedContact): Contact {
  return {
    avatar: contact.avatarUri,
    createdAt: new Date().toISOString(),
    emails: contact.emails,
    facebook: contact.facebook,
    firstName: contact.firstName,
    gisPoint: null,
    headline: contact.headline,
    id: contact.tempId,
    importantDates: null,
    instagram: contact.instagram,
    keepFrequencyDays: null,
    language: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    lastName: contact.lastName,
    latitude: null,
    linkedin: contact.linkedin,
    location: null,
    longitude: null,
    middleName: contact.middleName,
    myself: false,
    notes: null,
    phones: contact.phones,
    signal: contact.signal,
    timezone: null,
    updatedAt: new Date().toISOString(),
    userId: "",
    website: contact.website,
    whatsapp: contact.whatsapp,
  };
}

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
  const t = useWebTranslations("SettingsPage", "DataManagement.VCardImport");
  const router = useRouter();
  const parseImport = useParseVCardImportMutation();
  const commitImport = useCommitVCardImportMutation();
  const [step, setStep] = useState<Step>("intro");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [parsedContacts, setParsedContacts] = useState<VCardPreparedContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const openRef = useRef<() => void>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);

  const previewContacts = useMemo(
    () => parsedContacts.filter((contact) => contact.isValid).map(toPreviewContact),
    [parsedContacts],
  );

  const validContactsCount = useMemo(
    () => parsedContacts.filter((contact) => contact.isValid).length,
    [parsedContacts],
  );

  const invalidContactsCount = parsedContacts.length - validContactsCount;

  const selectableIds = useMemo(
    () => previewContacts.map((contact) => contact.id),
    [previewContacts],
  );

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

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
        <ModalTitle icon={<IconAddressBook size={20} stroke={1.5} />} text={t("ModalTitle")} />
      ),
    });
  }, [isImporting, modalId, step, t]);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const isAllSelected = selectableIds.length > 0 && selectableIds.every((id) => prev.has(id));
      if (isAllSelected) {
        return new Set<string>();
      }
      return new Set(selectableIds);
    });
  }, [selectableIds]);

  const handleToggleOne = useCallback(
    (id: string, options?: { shiftKey?: boolean; index?: number }) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        const rowIndex = options?.index;
        const hasRangeSelection =
          options?.shiftKey &&
          typeof rowIndex === "number" &&
          lastSelectedIndexRef.current !== null;

        if (hasRangeSelection && typeof rowIndex === "number") {
          const anchorIndex = lastSelectedIndexRef.current;
          if (anchorIndex === null) {
            return prev;
          }
          const start = Math.min(anchorIndex, rowIndex);
          const end = Math.max(anchorIndex, rowIndex);
          for (let index = start; index <= end; index += 1) {
            const row = previewContacts[index];
            if (row) {
              next.add(row.id);
            }
          }
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });

      if (typeof options?.index === "number") {
        lastSelectedIndexRef.current = options.index;
      }
    },
    [previewContacts],
  );

  const parseUpload = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setIsParsing(true);
    setStep("processing");

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file, file.name);
    });

    try {
      const result = await parseImport.mutateAsync(formData);

      const contacts = (result.contacts || []) as VCardPreparedContact[];
      const sortedContacts = sortVCardContactsForPreview(contacts);

      setParsedContacts(sortedContacts);
      lastSelectedIndexRef.current = null;
      setSelectedIds(
        new Set(sortedContacts.filter((item) => item.isValid).map((item) => item.tempId)),
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
      notifications.show(
        warningNotificationTemplate({
          description: t("NoContactsSelected"),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedContacts.length });

    let totalImported = 0;
    let totalSkipped = 0;

    try {
      const batchSize = VCARD_IMPORT_COMMIT_BATCH_SIZE;
      for (let i = 0; i < selectedContacts.length; i += batchSize) {
        const batch = selectedContacts.slice(i, i + batchSize);
        const isLastBatch = i + batchSize >= selectedContacts.length;

        const result = await commitImport.mutateAsync({
          body: { contacts: batch },
          finalize: isLastBatch,
        });

        totalImported += result.importedCount ?? 0;
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
          }),
          title: t("SuccessTitle"),
        }),
      );

      closeModal();
      router.push(WEBAPP_ROUTES.PEOPLE);
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
      <Stack gap="xl">
        <Stack align="center" gap="md" pt="sm">
          <ThemeIcon color="green" radius="xl" size={110} variant="light">
            <IconDeviceMobile size={64} />
          </ThemeIcon>
          <Title order={4} ta="center">
            {t("IntroTitle")}
          </Title>
        </Stack>

        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Group align="flex-start" gap="sm" wrap="nowrap">
              <IconCircleCheck
                size={18}
                style={{
                  color: "var(--mantine-color-green-6)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <Text size="sm">{t("IntroDescription1")}</Text>
            </Group>
            <Group align="flex-start" gap="sm" wrap="nowrap">
              <IconCircleCheck
                size={18}
                style={{
                  color: "var(--mantine-color-green-6)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <Text size="sm">{t("IntroDescription2")}</Text>
            </Group>
            <Group align="flex-start" gap="sm" wrap="nowrap">
              <IconCircleCheck
                size={18}
                style={{
                  color: "var(--mantine-color-green-6)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <Text size="sm">{t("IntroDescription3")}</Text>
            </Group>
          </Stack>
        </Paper>

        <ModalFooter
          actionLabel={t("Continue")}
          actionRightSection={<IconArrowRight size={16} />}
          cancelLabel={t("Cancel")}
          onAction={() => setStep("instructions")}
          onCancel={closeModal}
        />
      </Stack>,
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
            ].map(({ step, number }) => (
              <Group align="center" gap="sm" key={step} wrap="nowrap">
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
                <Text size="sm">{step}</Text>
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

  return renderWithNavigationProgress(
    <ModalScrollLayout
      footer={
        <ModalFooter
          actionDisabled={isImporting}
          actionLabel={t("ImportSelected", { count: selectedIds.size })}
          actionLeftSection={!isImporting ? <IconAddressBook size={16} /> : undefined}
          actionLoading={isImporting}
          backDisabled={isImporting}
          backLabel={t("Back")}
          backLeftSection={<IconArrowLeft size={16} />}
          cancelDisabled={isImporting}
          cancelLabel={t("Cancel")}
          mt={0}
          onAction={() => {
            void handleImport();
          }}
          onBack={() => setStep("upload")}
          onCancel={closeModal}
        />
      }
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Badge color="blue" variant="light">
              {t("Total", { count: parsedContacts.length })}
            </Badge>
            <Badge color="green" leftSection={<IconCircleCheck size={12} />} variant="light">
              {t("Valid", { count: validContactsCount })}
            </Badge>
            {invalidContactsCount > 0 ? (
              <Badge color="orange" leftSection={<IconAlertTriangle size={12} />} variant="light">
                {t("Invalid", { count: invalidContactsCount })}
              </Badge>
            ) : null}
          </Group>
        </Group>

        <Text c="dimmed" size="sm">
          {t("ChooseContactsHint")}
        </Text>

        <ContactsTable
          allSelected={allSelected}
          contacts={previewContacts}
          disableNameLink
          noContactsFound={t("NoContactsFound")}
          noContactsMatchSearch={t("NoContactsMatchSearch")}
          onSelectAll={handleToggleAll}
          onSelectOne={handleToggleOne}
          selectedIds={selectedIds}
          showSelection
          someSelected={someSelected}
          visibleColumns={["name", "headline", "phone", "email"]}
        />
      </Stack>
    </ModalScrollLayout>,
  );
}
