"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Group,
  Stack,
  Text,
  Alert,
  Badge,
  List,
  Anchor,
  ThemeIcon,
  Stepper,
  Center,
  Loader,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import {
  IconArrowLeft,
  IconUpload,
  IconX,
  IconFileZip,
  IconBrandLinkedin,
  IconChevronRight,
  IconCircleCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import type { Contact, LinkedInPreparedContact } from "@bondery/types";
import { errorNotificationTemplate, ModalTitle, successNotificationTemplate } from "@bondery/mantine-next";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import ContactsTable from "@/app/(app)/app/components/ContactsTable";
import { revalidateAll } from "../../actions";

type Step = "intro" | "instructions" | "upload" | "processing" | "preview";
const LINKEDIN_STEPPER_STEPS = 4;

const LINKEDIN_ACCEPTED_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "text/csv",
] as const;

interface LinkedInImportTranslations {
  ModalTitle: string;
  InstructionStep1Prefix: string;
  InstructionStep1LinkLabel: string;
  InstructionStep2: string;
  InstructionStep3: string;
  HaveZipFile: string;
  DropzoneTitle: string;
  DropzoneDescription: string;
  SelectFolder: string;
  UploadAnother: string;
  Total: string;
  Valid: string;
  Invalid: string;
  AlreadyExists: string;
  InvalidRowsHint: string;
  ExistingHandleTooltip: string;
  ImportSelected: string;
  ImportSuccess: string;
  NoContactsSelected: string;
  ParseError: string;
  ImportError: string;
  InvalidFile: string;
  Back: string;
  Cancel: string;
  SuccessTitle: string;
  ErrorTitle: string;
  IntroTitle: string;
  IntroDescription1: string;
  IntroDescription2: string;
  IntroDescription3: string;
  Continue: string;
  FilesAlertTitle: string;
  FilesAlertDescription: string;
  FilesAlertFileConnections: string;
  ProcessingConnections: string;
}

function buildImportedTitle(position: string | null, company: string | null): string | null {
  const normalizedPosition = typeof position === "string" ? position.trim() : "";
  const normalizedCompany = typeof company === "string" ? company.trim() : "";

  if (normalizedPosition && normalizedCompany) {
    return `${normalizedPosition} @${normalizedCompany}`;
  }

  if (normalizedPosition) {
    return normalizedPosition;
  }

  return normalizedCompany || null;
}

function toPreviewContact(contact: LinkedInPreparedContact): Contact {
  return {
    id: contact.tempId,
    userId: "",
    firstName: contact.firstName,
    middleName: contact.middleName,
    lastName: contact.lastName,
    title: buildImportedTitle(contact.position, contact.company),
    place: null,
    description: null,
    notes: null,
    avatar: null,
    lastInteraction: null,
    createdAt: new Date().toISOString(),
    connections: null,
    phones: [],
    emails: [],
    linkedin: contact.linkedinUrl,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
    importantEvents: null,
    birthdate: null,
    notifyBirthday: null,
    importantDates: null,
    myself: false,
    position: null,
    gender: null,
    language: null,
    timezone: null,
    nickname: null,
    pgpPublicKey: null,
    location: null,
    latitude: null,
    longitude: null,
  };
}

function sortLinkedInContactsForPreview(
  contacts: LinkedInPreparedContact[],
): LinkedInPreparedContact[] {
  return contacts
    .map((contact, index) => ({ contact, index }))
    .sort((left, right) => {
      const leftRank = left.contact.alreadyExists ? 0 : left.contact.isValid ? 1 : 2;
      const rightRank = right.contact.alreadyExists ? 0 : right.contact.isValid ? 1 : 2;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.contact);
}

export function LinkedInImportModal({
  t,
  modalId,
}: {
  t: (key: keyof LinkedInImportTranslations, values?: Record<string, string | number>) => string;
  modalId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedContacts, setParsedContacts] = useState<LinkedInPreparedContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!folderInputRef.current) {
      return;
    }

    folderInputRef.current.setAttribute("webkitdirectory", "");
    folderInputRef.current.setAttribute("directory", "");
  }, []);

  const previewContacts = useMemo(() => parsedContacts.map(toPreviewContact), [parsedContacts]);

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

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const activeStep =
    step === "instructions"
      ? 0
      : step === "upload"
        ? 1
        : step === "processing"
          ? 2
          : step === "preview"
            ? 3
            : null;

  useEffect(() => {
    if (!modalId) {
      return;
    }

    modals.updateModal({
      modalId,
      size:
        step === "preview"
          ? "80rem"
          : step === "intro" || step === "instructions" || step === "upload"
            ? "lg"
            : "xl",
      title: (
        <ModalTitle
          text={t("ModalTitle")}
          icon={<IconBrandLinkedin size={20} stroke={1.5} />}
          rightContent={
            activeStep !== null ? (
              <Stepper active={activeStep} allowNextStepsSelect={false} iconSize={28}>
                {Array.from({ length: LINKEDIN_STEPPER_STEPS }).map((_, index) => (
                  <Stepper.Step key={index} label=" " />
                ))}
              </Stepper>
            ) : null
          }
        />
      ),
    });
  }, [activeStep, modalId, step, t]);

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(selectableIds));
  };

  const handleToggleOne = (id: string) => {
    if (nonSelectableIds.has(id)) {
      return;
    }

    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

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
      const response = await fetch(`${API_ROUTES.CONTACTS_IMPORT_LINKEDIN}/parse`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("ParseError"));
      }

      const contacts = (result.contacts || []) as LinkedInPreparedContact[];
      const sortedContacts = sortLinkedInContactsForPreview(contacts);

      setParsedContacts(sortedContacts);
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
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("ParseError"),
        }),
      );
      setStep("upload");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    void parseUpload(files);
    event.target.value = "";
  };

  const handleImport = async () => {
    const selectedContacts = parsedContacts.filter((contact) => selectedIds.has(contact.tempId));

    if (selectedContacts.length === 0) {
      notifications.show({
        title: t("ErrorTitle"),
        message: t("NoContactsSelected"),
        color: "yellow",
      });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch(`${API_ROUTES.CONTACTS_IMPORT_LINKEDIN}/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: selectedContacts,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("ImportError"));
      }

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("ImportSuccess", {
            imported: result.importedCount ?? 0,
            updated: result.updatedCount ?? 0,
            skipped: result.skippedCount ?? 0,
          }),
        }),
      );

      modals.closeAll();
      await revalidateAll();
      router.push(WEBAPP_ROUTES.PEOPLE);
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("ImportError"),
        }),
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (step === "intro") {
    return (
      <Stack gap="md">
        <Group align="flex-start" wrap="nowrap" gap="lg">
          <ThemeIcon size={92} radius="xl" variant="light" color="blue">
            <IconBrandLinkedin size={56} />
          </ThemeIcon>
          <Stack gap="md">
            <Text fw={600}>{t("IntroTitle")}</Text>
            <Text size="sm" c="dimmed">
              {t("IntroDescription1")}
            </Text>
            <Text size="sm" c="dimmed">
              {t("IntroDescription2")}
            </Text>
            <Text size="sm" c="dimmed">
              {t("IntroDescription3")}
            </Text>
          </Stack>
        </Group>

        <Group justify="flex-end">
          <Button onClick={() => setStep("instructions")} rightSection={<IconChevronRight size={16} />}>
            {t("Continue")}
          </Button>
        </Group>
      </Stack>
    );
  }

  if (step === "instructions") {
    return (
      <Stack gap="md">
        <Group align="center" wrap="nowrap" gap="xl">
          <ThemeIcon size={92} radius="xl" variant="light" color="blue">
            <IconBrandLinkedin size={56} />
          </ThemeIcon>
          <Stack gap="md" flex={1}>
            <List type="ordered" listStyleType="decimal" withPadding spacing="xs" size="sm">
              <List.Item>
                {t("InstructionStep1Prefix")} {" "}
                <Anchor
                  href="https://www.linkedin.com/mypreferences/d/download-my-data"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("InstructionStep1LinkLabel")}
                </Anchor>
              </List.Item>

              <List.Item>{t("InstructionStep2")}</List.Item>
              <List.Item>{t("InstructionStep3")}</List.Item>
            </List>

            <Alert color="blue" variant="light">
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  {t("FilesAlertTitle")}
                </Text>
                <Text size="sm">{t("FilesAlertDescription")}</Text>
                <List spacing={2} size="sm">
                  <List.Item>{t("FilesAlertFileConnections")}</List.Item>
                </List>
              </Stack>
            </Alert>

            <Group justify="flex-end">
              <Group gap="xs">
                <Button
                  variant="subtle"
                  onClick={() => setStep("intro")}
                  leftSection={<IconArrowLeft size={16} />}
                >
                  {t("Back")}
                </Button>
                <Button onClick={() => setStep("upload")} rightSection={<IconChevronRight size={16} />}>
                  {t("HaveZipFile")}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Group>
      </Stack>
    );
  }

  if (step === "upload") {
    return (
      <Stack gap="md">
        <Dropzone
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
          accept={LINKEDIN_ACCEPTED_MIME_TYPES as unknown as string[]}
        >
          <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: "none" }}>
            <Dropzone.Accept>
              <IconUpload size={52} stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={52} stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileZip size={52} stroke={1.5} />
            </Dropzone.Idle>

            <div>
              <Text size="xl" inline>
                {t("DropzoneTitle")}
              </Text>
              <Text size="sm" c="dimmed" inline mt="xs">
                {t("DropzoneDescription")}
              </Text>
            </div>
          </Group>
        </Dropzone>

        <input
          ref={folderInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFolderChange}
        />

        <Group justify="flex-end">
          <Group gap="xs">
            <Button
              variant="subtle"
              onClick={() => setStep("instructions")}
              leftSection={<IconArrowLeft size={16} />}
            >
              {t("Back")}
            </Button>
            <Button onClick={() => folderInputRef.current?.click()} leftSection={<IconFileZip size={16} />}>
              {t("SelectFolder")}
            </Button>
          </Group>
        </Group>
      </Stack>
    );
  }

  if (step === "processing") {
    return (
      <Stack gap="lg" py="md">
        <Center>
          <Stack align="center" gap="sm">
            <Loader size="md" />
            <Text>{t("ProcessingConnections")}</Text>
          </Stack>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Badge color="blue" variant="light">
            {t("Total", { count: parsedContacts.length })}
          </Badge>
          <Badge color="green" variant="light" leftSection={<IconCircleCheck size={12} />}>
            {t("Valid", { count: validContactsCount })}
          </Badge>
          {invalidContactsCount > 0 ? (
            <Badge color="orange" variant="light" leftSection={<IconAlertTriangle size={12} />}>
              {t("Invalid", { count: invalidContactsCount })}
            </Badge>
          ) : null}
          {alreadyExistsCount > 0 ? (
            <Badge color="gray" variant="light">
              {t("AlreadyExists", { count: alreadyExistsCount })}
            </Badge>
          ) : null}
        </Group>
      </Group>

      {invalidContactsCount > 0 ? (
        <Alert color="orange" variant="light">
          {t("InvalidRowsHint")}
        </Alert>
      ) : null}

      <ContactsTable
        contacts={previewContacts}
        visibleColumns={["name", "title", "social"]}
        selectedIds={selectedIds}
        showSelection
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={handleToggleAll}
        onSelectOne={handleToggleOne}
        nonSelectableIds={nonSelectableIds}
        nonSelectableTooltip={t("ExistingHandleTooltip")}
        disableNameLink
      />

      <Group justify="flex-end">
        <Group gap="xs">
          <Button
            variant="subtle"
            onClick={() => setStep("upload")}
            leftSection={<IconArrowLeft size={16} />}
          >
            {t("Back")}
          </Button>
          <Button
            leftSection={<IconBrandLinkedin size={16} />}
            loading={isImporting}
            onClick={handleImport}
          >
            {t("ImportSelected", { count: selectedIds.size })}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
