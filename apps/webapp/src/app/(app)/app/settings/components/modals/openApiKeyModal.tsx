"use client";

import { docHref } from "@bondery/helpers";
import {
  CodeBlock,
  DescribedSelect,
  errorNotificationTemplate,
  ModalFooter,
  ModalTitle,
} from "@bondery/mantine-next";
import type { ApiKeyCreated, ApiKeyPermission } from "@bondery/schemas";
import { API_KEY_LIMITS } from "@bondery/schemas";
import { Alert, Anchor, Stack, Text, TextInput } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconFileText, IconKey } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { useCreateApiKeyMutation } from "@/lib/query/hooks/useApiKeys";
import { useApiKeyPermissionOptions } from "../../hooks/useApiKeyPermissionOptions";
import {
  resolveDefaultTestSnippetId,
  useApiKeyTestSnippets,
} from "../../hooks/useApiKeyTestSnippets";

interface OpenApiKeyModalOptions {
  apiBaseUrl: string;
  onCreated: (created: ApiKeyCreated) => void;
}

interface ApiKeyModalBodyProps extends OpenApiKeyModalOptions {
  modalId: string;
}

function ApiKeyModalBody({ modalId, onCreated, apiBaseUrl }: ApiKeyModalBodyProps) {
  const t = useWebTranslations("SettingsPage", "ApiKeys");
  const [step, setStep] = useState<"create" | "reveal">("create");
  const [label, setLabel] = useState("");
  const [permission, setPermission] = useState<ApiKeyPermission>("read");
  const [fullKey, setFullKey] = useState("");

  const createMutation = useCreateApiKeyMutation();
  const permissionOptions = useApiKeyPermissionOptions();
  const testSnippets = useApiKeyTestSnippets(apiBaseUrl, fullKey);
  const docsUrl = docHref("api.authentication");
  const os = useOs();
  const defaultTestSnippetId = resolveDefaultTestSnippetId(os);

  const trimmedLabel = label.trim();
  const canCreate = trimmedLabel.length > 0 && !createMutation.isPending;

  const { closeModal } = useModalDismiss(modalId, createMutation.isPending);

  useEffect(() => {
    modals.updateModal({
      modalId,
      size: step === "reveal" ? "lg" : "md",
    });
  }, [modalId, step]);

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        label: trimmedLabel,
        permission,
      });
      setFullKey(created.secret);
      setStep("reveal");
      onCreated(created);
    } catch {
      notifications.show({
        ...errorNotificationTemplate({
          description: t("CreateErrorDescription"),
          title: t("CreateErrorTitle"),
        }),
      });
    }
  };

  const handleDone = () => {
    setFullKey("");
    closeModal();
  };

  if (step === "create") {
    return (
      <Stack gap="md">
        <TextInput
          autoFocus
          data-autofocus
          label={t("LabelField")}
          maxLength={API_KEY_LIMITS.labelMaxLength}
          onChange={(event) => setLabel(event.currentTarget.value)}
          placeholder={t("LabelPlaceholder")}
          value={label}
        />
        <DescribedSelect
          allowDeselect={false}
          data={permissionOptions}
          label={t("PermissionField")}
          onChange={(value) => setPermission(value as ApiKeyPermission)}
          value={permission}
        />
        <ModalFooter
          actionDisabled={!canCreate}
          actionLabel={t("CreateButton")}
          actionLoading={createMutation.isPending}
          cancelLabel={t("Cancel")}
          onAction={handleCreate}
          onCancel={closeModal}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title={t("RevealAlertTitle")}>
        {t("RevealAlertDescription")}
      </Alert>

      <Stack gap={4}>
        <Text fw={500} size="sm">
          {t("SecretCodeLabel")}
        </Text>
        <CodeBlock
          code={fullKey}
          copiedLabel={t("CopiedButton")}
          copyLabel={t("CopyButton")}
          icon={<IconFileText size={14} />}
          language="plaintext"
        />
      </Stack>

      <Stack gap={4}>
        <Text fw={500} size="sm">
          {t("TestRequestLabel")}
        </Text>
        <CodeBlock
          copiedLabel={t("CopiedButton")}
          copyLabel={t("CopyButton")}
          defaultSnippetId={defaultTestSnippetId}
          snippets={testSnippets}
        />
        <Anchor href={docsUrl} rel="noopener noreferrer" size="sm" target="_blank">
          {t("LearnMoreApiDocs")}
        </Anchor>
      </Stack>

      <ModalFooter actionLabel={t("DoneButton")} onAction={handleDone} />
    </Stack>
  );
}

function ApiKeyModalTitle() {
  const t = useWebTranslations("SettingsPage", "ApiKeys");
  return <ModalTitle icon={<IconKey size={20} stroke={1.5} />} text={t("CreateTitle")} />;
}

export function openApiKeyModal(options: OpenApiKeyModalOptions) {
  const modalId = createModalId("api-key-create");

  modals.open({
    centered: true,
    children: <ApiKeyModalBody modalId={modalId} {...options} />,
    modalId,
    size: "md",
    title: <ApiKeyModalTitle />,
  });
}
