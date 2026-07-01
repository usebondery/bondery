"use client";

import { Alert, Anchor, Stack, Text, TextInput } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconFileText, IconKey } from "@tabler/icons-react";
import type { ApiKeyCreated, ApiKeyPermission } from "@bondery/schemas";
import { API_KEY_LIMITS } from "@bondery/schemas";
import { HELP_DOCS_URL } from "@bondery/helpers/globals/paths";
import {
  CodeBlock,
  DescribedSelect,
  errorNotificationTemplate,
  ModalFooter,
  ModalTitle,
} from "@bondery/mantine-next";
import { useEffect, useState } from "react";
import { useCreateApiKeyMutation } from "@/lib/query/hooks/useApiKeys";
import { createModalId, useModalBlocking } from "@/lib/modals";
import { buildApiKeyPermissionOptions } from "./apiKeyPermissionOptions";
import { buildApiKeyTestSnippets, resolveDefaultTestSnippetId } from "./buildApiKeyTestSnippets";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

interface OpenApiKeyModalOptions {
  t: TranslateFn;
  onCreated: (created: ApiKeyCreated) => void;
  apiBaseUrl: string;
}

interface ApiKeyModalBodyProps extends OpenApiKeyModalOptions {
  modalId: string;
}

function ApiKeyModalBody({ modalId, t, onCreated, apiBaseUrl }: ApiKeyModalBodyProps) {
  const [step, setStep] = useState<"create" | "reveal">("create");
  const [label, setLabel] = useState("");
  const [permission, setPermission] = useState<ApiKeyPermission>("read");
  const [fullKey, setFullKey] = useState("");

  const createMutation = useCreateApiKeyMutation();
  const permissionOptions = buildApiKeyPermissionOptions(t);
  const docsUrl = `${HELP_DOCS_URL}/api/authentication`;
  const os = useOs();
  const defaultTestSnippetId = resolveDefaultTestSnippetId(os);

  const trimmedLabel = label.trim();
  const canCreate = trimmedLabel.length > 0 && !createMutation.isPending;

  useModalBlocking(modalId, createMutation.isPending);

  useEffect(() => {
    modals.updateModal({
      modalId,
      size: step === "reveal" ? "lg" : "md",
    });
  }, [modalId, step]);

  const handleCreate = async () => {
    if (!canCreate) return;
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
          title: t("CreateErrorTitle"),
          description: t("CreateErrorDescription"),
        }),
      });
    }
  };

  const handleDone = () => {
    setFullKey("");
    modals.close(modalId);
  };

  if (step === "create") {
    return (
      <Stack gap="md">
        <TextInput
          label={t("LabelField")}
          placeholder={t("LabelPlaceholder")}
          value={label}
          onChange={(event) => setLabel(event.currentTarget.value)}
          maxLength={API_KEY_LIMITS.labelMaxLength}
          autoFocus
          data-autofocus
        />
        <DescribedSelect
          label={t("PermissionField")}
          data={permissionOptions}
          value={permission}
          onChange={(value) => setPermission(value as ApiKeyPermission)}
          allowDeselect={false}
        />
        <ModalFooter
          cancelLabel={t("Cancel")}
          onCancel={() => modals.close(modalId)}
          actionLabel={t("CreateButton")}
          onAction={handleCreate}
          actionDisabled={!canCreate}
          actionLoading={createMutation.isPending}
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
        <Text size="sm" fw={500}>
          {t("SecretCodeLabel")}
        </Text>
        <CodeBlock
          icon={<IconFileText size={14} />}
          language="plaintext"
          code={fullKey}
          copyLabel={t("CopyButton")}
          copiedLabel={t("CopiedButton")}
        />
      </Stack>

      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {t("TestRequestLabel")}
        </Text>
        <CodeBlock
          snippets={buildApiKeyTestSnippets(apiBaseUrl, fullKey, t)}
          defaultSnippetId={defaultTestSnippetId}
          copyLabel={t("CopyButton")}
          copiedLabel={t("CopiedButton")}
        />
        <Anchor href={docsUrl} target="_blank" rel="noopener noreferrer" size="sm">
          {t("LearnMoreApiDocs")}
        </Anchor>
      </Stack>

      <ModalFooter actionLabel={t("DoneButton")} onAction={handleDone} />
    </Stack>
  );
}

export function openApiKeyModal(options: OpenApiKeyModalOptions) {
  const modalId = createModalId("api-key-create");

  modals.open({
    modalId,
    title: <ModalTitle text={options.t("CreateTitle")} icon={<IconKey size={20} stroke={1.5} />} />,
    size: "md",
    centered: true,
    closeOnClickOutside: true,
    withCloseButton: true,
    children: <ApiKeyModalBody modalId={modalId} {...options} />,
  });
}
