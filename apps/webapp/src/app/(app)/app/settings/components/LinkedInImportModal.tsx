"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Stack, Text, Alert, Badge, List, Anchor } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import {
  IconUpload,
  IconX,
  IconFileZip,
  IconBrandLinkedin,
  IconCircleCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import type { Contact, LinkedInPreparedContact } from "@bondery/types";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import ContactsTable from "@/app/(app)/app/components/ContactsTable";

type Step = "instructions" | "upload" | "preview";

const LINKEDIN_ACCEPTED_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "text/csv",
] as const;

interface LinkedInImportTranslations {
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
    avatarColor: contact.alreadyExists ? "gray" : "blue",
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
}: {
  t: (key: keyof LinkedInImportTranslations, values?: Record<string, string | number>) => string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("instructions");
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
      notifications.show({
        title: t("ErrorTitle"),
        message: error instanceof Error ? error.message : t("ParseError"),
        color: "red",
      });
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

      notifications.show({
        title: t("SuccessTitle"),
        message: t("ImportSuccess", {
          imported: result.importedCount ?? 0,
          updated: result.updatedCount ?? 0,
          skipped: result.skippedCount ?? 0,
        }),
        color: "green",
      });

      modals.closeAll();
      router.push(WEBAPP_ROUTES.PEOPLE);
    } catch (error) {
      notifications.show({
        title: t("ErrorTitle"),
        message: error instanceof Error ? error.message : t("ImportError"),
        color: "red",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (step === "instructions") {
    return (
      <Stack gap="md">
        <List type="ordered" listStyleType="decimal" withPadding spacing="sm">
          <List.Item>
            {t("InstructionStep1Prefix")}{" "}
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
        <Group justify="flex-end">
          <Button variant="default" onClick={() => modals.closeAll()}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => setStep("upload")}>{t("HaveZipFile")}</Button>
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
            notifications.show({
              title: t("ErrorTitle"),
              message: t("InvalidFile"),
              color: "red",
            });
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

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => setStep("instructions")}>
            {t("Back")}
          </Button>
          <Group>
            <Button variant="default" onClick={() => modals.closeAll()}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => folderInputRef.current?.click()}>{t("SelectFolder")}</Button>
          </Group>
        </Group>
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
        <Button variant="subtle" onClick={() => setStep("upload")}>
          {t("UploadAnother")}
        </Button>
      </Group>

      {invalidContactsCount > 0 ? (
        <Alert color="orange" variant="light">
          {t("InvalidRowsHint")}
        </Alert>
      ) : null}

      <ContactsTable
        contacts={previewContacts}
        visibleColumns={["avatar", "name", "title", "social"]}
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

      <Group justify="space-between">
        <Button variant="subtle" onClick={() => setStep("upload")}>
          {t("Back")}
        </Button>
        <Group>
          <Button variant="default" onClick={() => modals.closeAll()}>
            {t("Cancel")}
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
