"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  List,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import {
  IconAlertTriangle,
  IconBrandInstagram,
  IconCircleCheck,
  IconFileZip,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import type { Contact, InstagramImportStrategy, InstagramPreparedContact } from "@bondery/types";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import ContactsTable from "@/app/(app)/app/components/ContactsTable";

type Step = "instructions" | "upload" | "strategy" | "preview";

const INSTAGRAM_IMPORT_ROUTE = "/api/contacts/import/instagram";

interface InstagramImportTranslations {
  SectionTitle: string;
  ModalTitle: string;
  Instagram: string;
  CardDescription: string;
  InstructionStep1Prefix: string;
  InstructionStep1LinkLabel: string;
  InstructionStep2: string;
  InstructionStep3: string;
  InstructionStep4: string;
  InstructionStep5: string;
  InstructionStep6: string;
  InstructionStep7: string;
  InstructionStep8: string;
  InstructionStep9: string;
  InstructionStep10: string;
  InstructionStep11: string;
  HaveZipFile: string;
  DropzoneTitle: string;
  DropzoneDescription: string;
  SelectZipFile: string;
  SelectedZip: string;
  FilesReady: string;
  StrategyLabel: string;
  StrategyCloseFriends: string;
  StrategyFollowing: string;
  StrategyFollowers: string;
  StrategyFollowingAndFollowers: string;
  StrategyMutualFollowing: string;
  ParseUploaded: string;
  UploadAnother: string;
  Total: string;
  Valid: string;
  Invalid: string;
  InvalidRowsHint: string;
  ImportSelected: string;
  ImportSuccess: string;
  NoContactsSelected: string;
  ParseError: string;
  ImportError: string;
  InvalidFile: string;
  MissingUpload: string;
  Back: string;
  Cancel: string;
  SuccessTitle: string;
  ErrorTitle: string;
}

async function readApiResponse(response: Response): Promise<{
  data: Record<string, unknown> | null;
  text: string | null;
}> {
  const raw = await response.text();

  if (!raw) {
    return { data: null, text: null };
  }

  try {
    return {
      data: JSON.parse(raw) as Record<string, unknown>,
      text: null,
    };
  } catch {
    return {
      data: null,
      text: raw,
    };
  }
}

function readNumberField(data: Record<string, unknown> | null, key: string): number {
  const value = data?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isZipFile(file: File | null): file is File {
  if (!file) {
    return false;
  }

  const normalizedName = file.name.toLowerCase();
  const normalizedType = (file.type || "").toLowerCase();

  return (
    normalizedName.endsWith(".zip") ||
    normalizedType.includes("zip") ||
    normalizedType === "application/octet-stream"
  );
}

function toPreviewContact(contact: InstagramPreparedContact): Contact {
  return {
    id: contact.tempId,
    userId: "",
    firstName: contact.firstName,
    middleName: contact.middleName,
    lastName: contact.lastName,
    title: null,
    place: null,
    description: null,
    notes: null,
    avatarColor: "pink",
    avatar: null,
    lastInteraction: null,
    createdAt: new Date().toISOString(),
    connections: null,
    phones: [],
    emails: [],
    linkedin: null,
    instagram: contact.instagramUrl,
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

function strategyOptions(
  t: (key: keyof InstagramImportTranslations, values?: Record<string, string | number>) => string,
): Array<{ value: InstagramImportStrategy; label: string }> {
  return [
    { value: "close_friends", label: t("StrategyCloseFriends") },
    { value: "following", label: t("StrategyFollowing") },
    { value: "followers", label: t("StrategyFollowers") },
    { value: "following_and_followers", label: t("StrategyFollowingAndFollowers") },
    { value: "mutual_following", label: t("StrategyMutualFollowing") },
  ];
}

export function InstagramImportModal({
  t,
}: {
  t: (key: keyof InstagramImportTranslations, values?: Record<string, string | number>) => string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("instructions");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadedZip, setUploadedZip] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<InstagramImportStrategy>("following_and_followers");
  const [parsedContacts, setParsedContacts] = useState<InstagramPreparedContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  const previewContacts = useMemo(() => parsedContacts.map(toPreviewContact), [parsedContacts]);

  const validContactsCount = useMemo(
    () => parsedContacts.filter((contact) => contact.isValid).length,
    [parsedContacts],
  );

  const invalidContactsCount = parsedContacts.length - validContactsCount;

  const allSelected = previewContacts.length > 0 && selectedIds.size === previewContacts.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(previewContacts.map((contact) => contact.id)));
  };

  const handleToggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const parseUpload = async () => {
    if (!uploadedZip) {
      notifications.show({
        title: t("ErrorTitle"),
        message: t("MissingUpload"),
        color: "yellow",
      });
      return;
    }

    setIsParsing(true);

    const formData = new FormData();
    formData.append("files", uploadedZip, uploadedZip.name);
    formData.append("strategy", strategy);

    try {
      const response = await fetch(`${INSTAGRAM_IMPORT_ROUTE}/parse`, {
        method: "POST",
        body: formData,
      });

      const { data, text } = await readApiResponse(response);

      if (!response.ok) {
        const apiError = data && typeof data.error === "string" ? data.error : null;
        const fallback =
          response.status === 413
            ? "Uploaded ZIP is too large. Please export only contacts data."
            : `${t("ParseError")} (HTTP ${response.status})`;

        throw new Error(apiError || text || fallback);
      }

      const contacts = (data?.contacts || []) as InstagramPreparedContact[];
      setParsedContacts(contacts);
      setSelectedIds(
        new Set(contacts.filter((item) => item.isValid && item.likelyPerson).map((item) => item.tempId)),
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

  const handleZipSelected = (file: File | null) => {
    if (!isZipFile(file)) {
      notifications.show({
        title: t("ErrorTitle"),
        message: t("InvalidFile"),
        color: "red",
      });

      return;
    }

    setUploadedZip(file);
    setStep("strategy");
  };

  const handleZipInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleZipSelected(file);
    event.target.value = "";
  };

  const handleZipDrop = (files: File[]) => {
    if (files.length !== 1) {
      notifications.show({
        title: t("ErrorTitle"),
        message: t("InvalidFile"),
        color: "red",
      });

      return;
    }

    handleZipSelected(files[0]);
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
      const response = await fetch(`${INSTAGRAM_IMPORT_ROUTE}/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: selectedContacts,
        }),
      });

      const { data, text } = await readApiResponse(response);

      if (!response.ok) {
        const apiError = data && typeof data.error === "string" ? data.error : null;
        throw new Error(apiError || text || `${t("ImportError")} (HTTP ${response.status})`);
      }

      notifications.show({
        title: t("SuccessTitle"),
        message: t("ImportSuccess", {
          imported: readNumberField(data, "importedCount"),
          updated: readNumberField(data, "updatedCount"),
          skipped: readNumberField(data, "skippedCount"),
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
            {t("InstructionStep1Prefix")} {" "}
            <Anchor
              href="https://accountscenter.instagram.com/info_and_permissions/dyi/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("InstructionStep1LinkLabel")}
            </Anchor>
          </List.Item>
          <List.Item>{t("InstructionStep2")}</List.Item>
          <List.Item>{t("InstructionStep3")}</List.Item>
          <List.Item>{t("InstructionStep4")}</List.Item>
          <List.Item>{t("InstructionStep5")}</List.Item>
          <List.Item>{t("InstructionStep6")}</List.Item>
          <List.Item>{t("InstructionStep7")}</List.Item>
          <List.Item>{t("InstructionStep8")}</List.Item>
          <List.Item>{t("InstructionStep9")}</List.Item>
          <List.Item>{t("InstructionStep10")}</List.Item>
          <List.Item>{t("InstructionStep11")}</List.Item>
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
          onDrop={handleZipDrop}
          onReject={() => {
            notifications.show({
              title: t("ErrorTitle"),
              message: t("InvalidFile"),
              color: "red",
            });
          }}
          loading={isParsing}
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
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
          style={{ display: "none" }}
          onChange={handleZipInputChange}
        />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => setStep("instructions")}>
            {t("Back")}
          </Button>
          <Button onClick={() => zipInputRef.current?.click()}>{t("SelectZipFile")}</Button>
        </Group>
      </Stack>
    );
  }

  if (step === "strategy") {
    return (
      <Stack gap="md">
        {uploadedZip ? (
          <Alert color="blue" variant="light">
            <Stack gap={4}>
              <Text size="sm">{t("SelectedZip")}</Text>
              <Text size="sm" fw={600}>
                {uploadedZip.name}
              </Text>
            </Stack>
          </Alert>
        ) : null}

        <Select
          label={t("StrategyLabel")}
          data={strategyOptions(t)}
          value={strategy}
          onChange={(value) => setStrategy((value as InstagramImportStrategy) || "following_and_followers")}
          allowDeselect={false}
        />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => setStep("upload")}>
            {t("Back")}
          </Button>
          <Group>
            <Button variant="default" onClick={() => modals.closeAll()}>
              {t("Cancel")}
            </Button>
            <Button variant="default" onClick={() => setStep("upload")}>
              {t("UploadAnother")}
            </Button>
            <Button loading={isParsing} onClick={() => void parseUpload()}>
              {t("ParseUploaded")}
            </Button>
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
        </Group>
        <Button variant="subtle" onClick={() => setStep("strategy")}>
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
        disableNameLink
      />

      <Group justify="space-between">
        <Button variant="subtle" onClick={() => setStep("strategy")}>
          {t("Back")}
        </Button>
        <Group>
          <Button variant="default" onClick={() => modals.closeAll()}>
            {t("Cancel")}
          </Button>
          <Button
            leftSection={<IconBrandInstagram size={16} />}
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
