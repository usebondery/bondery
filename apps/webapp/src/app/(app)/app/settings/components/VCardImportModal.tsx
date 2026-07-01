"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { useRouter } from "next/navigation";
import {
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Badge,
  List,
  ThemeIcon,
  Center,
  Loader,
  Progress,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import {
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconDeviceMobile,
  IconCircleCheck,
  IconAlertTriangle,
  IconAddressBook,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import type { Contact, VCardPreparedContact } from "@bondery/schemas";
import {
  DropzoneContent,
  ModalFooter,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
  warningNotificationTemplate,
} from "@bondery/mantine-next";
import { NavigationProgress } from "@mantine/nprogress";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import ContactsTable from "@/app/(app)/app/components/contacts/ContactsTableV2";
import {
  useCommitVCardImportMutation,
  useParseVCardImportMutation,
} from "@/lib/query/hooks/useImports";
import { useModalBlocking } from "@/lib/modals";
import { useImporterNavigationProgress } from "./useImporterNavigationProgress";

type Step = "intro" | "instructions" | "upload" | "processing" | "preview";

const IMPORT_BATCH_SIZE = 25;

const STEP_PROGRESS: Record<Step, number> = {
  intro: 12,
  instructions: 30,
  upload: 50,
  processing: 68,
  preview: 84,
};

interface VCardImportTranslations {
  ModalTitle: string;
  IntroTitle: string;
  IntroDescription1: string;
  IntroDescription2: string;
  IntroDescription3: string;
  Continue: string;
  InstructionsTitle: string;
  InstructionStep1: string;
  InstructionStep2: string;
  InstructionStep3: string;
  InstructionStep4: string;
  HaveVcfFile: string;
  DropzoneTitle: string;
  DropzoneDescription: string;
  SelectVcfFile: string;
  Total: string;
  Valid: string;
  Invalid: string;
  ImportSelected: string;
  ChooseContactsHint: string;
  ImportSuccess: string;
  NoContactsSelected: string;
  ParseError: string;
  ImportError: string;
  InvalidFile: string;
  Back: string;
  Cancel: string;
  SuccessTitle: string;
  ErrorTitle: string;
  ProcessingContacts: string;
  ImportingTitle: string;
  ImportingProgress: string;
  NoContactsFound: string;
  NoContactsMatchSearch: string;
}

function toPreviewContact(contact: VCardPreparedContact): Contact {
  return {
    id: contact.tempId,
    userId: "",
    firstName: contact.firstName,
    middleName: contact.middleName,
    lastName: contact.lastName,
    headline: contact.headline,
    location: null,
    notes: null,
    avatar: contact.avatarUri,
    lastInteraction: null,
    lastInteractionActivityId: null,
    keepFrequencyDays: null,
    createdAt: new Date().toISOString(),
    phones: contact.phones,
    emails: contact.emails,
    linkedin: contact.linkedin,
    instagram: contact.instagram,
    whatsapp: contact.whatsapp,
    facebook: contact.facebook,
    website: contact.website,
    signal: contact.signal,
    importantDates: null,
    myself: false,
    language: null,
    timezone: null,
    latitude: null,
    longitude: null,
    gisPoint: null,
  };
}

function sortVCardContactsForPreview(
  contacts: VCardPreparedContact[],
): VCardPreparedContact[] {
  return contacts
    .map((contact, index) => ({ contact, index }))
    .sort((left, right) => {
      const leftRank = left.contact.isValid ? 0 : 1;
      const rightRank = right.contact.isValid ? 0 : 1;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.index - right.index;
    })
    .map((entry) => entry.contact);
}

export function VCardImportModal({
  t,
  modalId,
  showNavigationProgress = true,
}: {
  t: (
    key: keyof VCardImportTranslations,
    values?: Record<string, string | number>,
  ) => string;
  modalId?: string;
  showNavigationProgress?: boolean;
}) {
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
  const [parsedContacts, setParsedContacts] = useState<VCardPreparedContact[]>(
    [],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const openRef = useRef<() => void>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);

  const previewContacts = useMemo(
    () =>
      parsedContacts.filter((contact) => contact.isValid).map(toPreviewContact),
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

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  useImporterNavigationProgress({
    step,
    stepProgress: STEP_PROGRESS,
    importProgress,
  });

  const renderWithNavigationProgress = (content: JSX.Element) => (
    <>
      {showNavigationProgress ? <NavigationProgress /> : null}
      {content}
    </>
  );

  const closeModal = () => {
    if (modalId) {
      modals.close(modalId);
      return;
    }
    modals.closeAll();
  };

  useModalBlocking(modalId, isParsing || isImporting || step === "processing");

  useEffect(() => {
    if (!modalId) return;

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
        <ModalTitle
          text={t("ModalTitle")}
          icon={<IconAddressBook size={20} stroke={1.5} />}
        />
      ),
    });
  }, [isImporting, isParsing, modalId, step, t]);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const isAllSelected =
        selectableIds.length > 0 && selectableIds.every((id) => prev.has(id));
      if (isAllSelected) return new Set<string>();
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
          const start = Math.min(lastSelectedIndexRef.current!, rowIndex);
          const end = Math.max(lastSelectedIndexRef.current!, rowIndex);
          for (let index = start; index <= end; index += 1) {
            const row = previewContacts[index];
            if (row) next.add(row.id);
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
    if (files.length === 0) return;

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
        new Set(
          sortedContacts
            .filter((item) => item.isValid)
            .map((item) => item.tempId),
        ),
      );
      setStep("preview");
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("ParseError"),
        }),
      );
      setStep("upload");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    const selectedContacts = parsedContacts.filter((contact) =>
      selectedIds.has(contact.tempId),
    );

    if (selectedContacts.length === 0) {
      notifications.show(
        warningNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("NoContactsSelected"),
        }),
      );
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedContacts.length });

    let totalImported = 0;
    let totalSkipped = 0;

    try {
      for (let i = 0; i < selectedContacts.length; i += IMPORT_BATCH_SIZE) {
        const batch = selectedContacts.slice(i, i + IMPORT_BATCH_SIZE);
        const isLastBatch = i + IMPORT_BATCH_SIZE >= selectedContacts.length;

        const result = await commitImport.mutateAsync({
          body: { contacts: batch },
          finalize: isLastBatch,
        });

        totalImported += result.importedCount ?? 0;
        totalSkipped += result.skippedCount ?? 0;

        setImportProgress({
          current: Math.min(i + IMPORT_BATCH_SIZE, selectedContacts.length),
          total: selectedContacts.length,
        });
      }

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("ImportSuccess", {
            imported: totalImported,
            skipped: totalSkipped,
          }),
        }),
      );

      if (modalId) {
        modals.close(modalId);
      } else {
        modals.closeAll();
      }
      router.push(WEBAPP_ROUTES.PEOPLE);
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description:
            error instanceof Error ? error.message : t("ImportError"),
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
          <ThemeIcon size={110} radius="xl" variant="light" color="green">
            <IconDeviceMobile size={64} />
          </ThemeIcon>
          <Title order={4} ta="center">
            {t("IntroTitle")}
          </Title>
        </Stack>

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <IconCircleCheck
                size={18}
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  color: "var(--mantine-color-green-6)",
                }}
              />
              <Text size="sm">{t("IntroDescription1")}</Text>
            </Group>
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <IconCircleCheck
                size={18}
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  color: "var(--mantine-color-green-6)",
                }}
              />
              <Text size="sm">{t("IntroDescription2")}</Text>
            </Group>
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <IconCircleCheck
                size={18}
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  color: "var(--mantine-color-green-6)",
                }}
              />
              <Text size="sm">{t("IntroDescription3")}</Text>
            </Group>
          </Stack>
        </Paper>

        <ModalFooter
          cancelLabel={t("Cancel")}
          onCancel={closeModal}
          actionLabel={t("Continue")}
          onAction={() => setStep("instructions")}
          actionRightSection={<IconArrowRight size={16} />}
        />
      </Stack>,
    );
  }

  if (step === "instructions") {
    return renderWithNavigationProgress(
      <Stack gap="md">
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text fw={600} size="sm" ta="center">
              {t("InstructionsTitle")}
            </Text>
            <Divider />
            {[
              t("InstructionStep1"),
              t("InstructionStep2"),
              t("InstructionStep3"),
              t("InstructionStep4"),
            ].map((step, i) => (
              <Group key={i} gap="sm" wrap="nowrap" align="center">
                <ThemeIcon
                  size={22}
                  radius="xl"
                  variant="filled"
                  color="green"
                  style={{ flexShrink: 0 }}
                >
                  <Text component="span" size="xs" fw={700} lh={1}>
                    {i + 1}
                  </Text>
                </ThemeIcon>
                <Text size="sm">{step}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>

        <ModalFooter
          backLabel={t("Back")}
          backLeftSection={<IconArrowLeft size={16} />}
          onBack={() => setStep("intro")}
          cancelLabel={t("Cancel")}
          onCancel={closeModal}
          actionLabel={t("HaveVcfFile")}
          onAction={() => setStep("upload")}
          actionRightSection={<IconArrowRight size={16} />}
        />
      </Stack>,
    );
  }

  if (step === "upload") {
    return renderWithNavigationProgress(
      <Stack gap="md">
        <Dropzone
          openRef={openRef}
          onDrop={(files) => {
            void parseUpload(files);
          }}
          onReject={() => {
            notifications.show(
              errorNotificationTemplate({
                title: t("ErrorTitle"),
                description: t("InvalidFile"),
              }),
            );
          }}
          loading={isParsing}
          maxSize={30 * 1024 * 1024}
          maxFiles={1}
          accept={{
            "text/vcard": [".vcf"],
            "text/x-vcard": [".vcf"],
            "text/directory": [".vcf"],
            "application/octet-stream": [".vcf"],
          }}
        >
          <DropzoneContent
            title={t("DropzoneTitle")}
            description={t("DropzoneDescription")}
          />
        </Dropzone>

        <ModalFooter
          backLabel={t("Back")}
          backLeftSection={<IconArrowLeft size={16} />}
          onBack={() => setStep("instructions")}
          cancelLabel={t("Cancel")}
          onCancel={closeModal}
          actionLabel={t("SelectVcfFile")}
          onAction={() => openRef.current?.()}
          actionLeftSection={<IconAddressBook size={16} />}
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
    const percentage = Math.round(
      (importProgress.current / importProgress.total) * 100,
    );
    return renderWithNavigationProgress(
      <Stack gap="lg" py="md">
        <Center>
          <Stack align="center" gap="md" w="100%" maw={400}>
            <Text fw={600}>{t("ImportingTitle")}</Text>
            <Progress value={percentage} w="100%" size="lg" />
            <Text size="sm" c="dimmed">
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
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Badge color="blue" variant="light">
            {t("Total", { count: parsedContacts.length })}
          </Badge>
          <Badge
            color="green"
            variant="light"
            leftSection={<IconCircleCheck size={12} />}
          >
            {t("Valid", { count: validContactsCount })}
          </Badge>
          {invalidContactsCount > 0 ? (
            <Badge
              color="orange"
              variant="light"
              leftSection={<IconAlertTriangle size={12} />}
            >
              {t("Invalid", { count: invalidContactsCount })}
            </Badge>
          ) : null}
        </Group>
      </Group>

      <Text size="sm" c="dimmed">
        {t("ChooseContactsHint")}
      </Text>

      <ContactsTable
        contacts={previewContacts}
        visibleColumns={["name", "headline", "phone", "email"]}
        selectedIds={selectedIds}
        showSelection
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={handleToggleAll}
        onSelectOne={handleToggleOne}
        disableNameLink
        noContactsFound={t("NoContactsFound")}
        noContactsMatchSearch={t("NoContactsMatchSearch")}
      />

      <ModalFooter
        backLabel={t("Back")}
        backLeftSection={<IconArrowLeft size={16} />}
        onBack={() => setStep("upload")}
        backDisabled={isImporting}
        cancelLabel={t("Cancel")}
        onCancel={closeModal}
        cancelDisabled={isImporting}
        actionLabel={t("ImportSelected", { count: selectedIds.size })}
        onAction={() => {
          void handleImport();
        }}
        actionLeftSection={
          !isImporting ? <IconAddressBook size={16} /> : undefined
        }
        actionLoading={isImporting}
        actionDisabled={isImporting}
      />
    </Stack>,
  );
}
