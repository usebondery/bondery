"use client";

import {
  ActionIcon,
  Box,
  Button,
  Card,
  CardSection,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconKey, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_KEY_LIMITS, type ApiKeyCreated, type ApiKeyListItem } from "@bondery/schemas";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { formatLastUsedAtWithFormatter, useDateFormatter } from "@/lib/i18n/useDateFormatter";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { InlineEditableInput } from "@/app/(app)/app/person/[person_id]/components/InlineEditableInput";
import { DescribedSelect, errorNotificationTemplate, ModalTitle } from "@bondery/mantine-next";
import { SettingsSection } from "./SettingsSection";
import { openApiKeyModal } from "./openApiKeyModal";
import { buildApiKeyPermissionOptions } from "./apiKeyPermissionOptions";
import {
  useDeleteApiKeyMutation,
  useUpdateApiKeyLabelMutation,
} from "@/lib/query/hooks/useApiKeys";

interface ApiKeysSectionProps {
  initialApiKeys: ApiKeyListItem[];
  apiBaseUrl: string;
}

interface ApiKeyRowProps {
  apiKey: ApiKeyListItem;
  permissionOptions: ReturnType<typeof buildApiKeyPermissionOptions>;
  lastUsedLabel: string;
  deleteAriaLabel: string;
  onDelete: () => void;
  onLabelUpdated: (label: string) => void;
}

const LAST_USED_COLUMN_WIDTH = 180;
const KEY_PREFIX_COLUMN_WIDTH = 160;
const PERMISSION_SELECT_WIDTH = 172;

function ApiKeyRow({
  apiKey,
  permissionOptions,
  lastUsedLabel,
  deleteAriaLabel,
  onDelete,
  onLabelUpdated,
}: ApiKeyRowProps) {
  const t = useTranslations("SettingsPage.ApiKeys");
  const [label, setLabel] = useState(apiKey.label);
  const [isSaving, setIsSaving] = useState(false);
  const persistedLabelRef = useRef(apiKey.label);
  const updateMutation = useUpdateApiKeyLabelMutation();

  useEffect(() => {
    setLabel(apiKey.label);
    persistedLabelRef.current = apiKey.label;
  }, [apiKey.label]);

  const saveLabel = useCallback(async () => {
    const trimmed = label.trim();
    if (!trimmed || trimmed === persistedLabelRef.current) {
      setLabel(persistedLabelRef.current);
      return;
    }

    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({ id: apiKey.id, patch: { label: trimmed } });
      persistedLabelRef.current = trimmed;
      setLabel(trimmed);
      onLabelUpdated(trimmed);
    } catch {
      setLabel(persistedLabelRef.current);
      notifications.show({
        ...errorNotificationTemplate({
          title: t("EditErrorTitle"),
          description: t("EditErrorDescription"),
        }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [apiKey.id, label, onLabelUpdated, t, updateMutation]);

  return (
    <Card withBorder padding="sm" radius="md">
      <Group wrap="nowrap" gap="sm" align="center">
        <ThemeIcon variant="light" color="gray" size="lg" radius="md">
          <IconKey size={18} stroke={1.5} />
        </ThemeIcon>

        <Box style={{ flex: 1, minWidth: 120 }}>
          <InlineEditableInput
            aria-label={t("LabelField")}
            value={label}
            maxLength={API_KEY_LIMITS.labelMaxLength}
            isSaving={isSaving}
            onChange={setLabel}
            onBlur={() => void saveLabel()}
            style={{ width: "100%" }}
            size="sm"
          />
        </Box>

        <DescribedSelect
          aria-label={t("PermissionField")}
          data={permissionOptions}
          value={apiKey.permission}
          onChange={() => {}}
          disabled
          w={PERMISSION_SELECT_WIDTH}
          miw={PERMISSION_SELECT_WIDTH}
          style={{ flexShrink: 0 }}
        />

        <Text
          size="xs"
          ff="monospace"
          c="dimmed"
          truncate
          w={KEY_PREFIX_COLUMN_WIDTH}
          style={{ flexShrink: 0 }}
        >
          {apiKey.keyPrefix}
        </Text>

        <Text
          size="xs"
          c="dimmed"
          truncate
          w={LAST_USED_COLUMN_WIDTH}
          style={{ flexShrink: 0 }}
        >
          {lastUsedLabel}
        </Text>

        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          aria-label={deleteAriaLabel}
          onClick={onDelete}
          style={{ flexShrink: 0 }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Card>
  );
}

export function ApiKeysSection({ initialApiKeys, apiBaseUrl }: ApiKeysSectionProps) {
  const t = useTranslations("SettingsPage.ApiKeys");
  const tCommon = useTranslations("WebAppCommon");
  const formatter = useDateFormatter();
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const deleteMutation = useDeleteApiKeyMutation();

  const atLimit = apiKeys.length >= API_KEY_LIMITS.maxPerUser;
  const permissionOptions = useMemo(() => buildApiKeyPermissionOptions(t), [t]);

  const lastUsedLabel = (lastUsedAt: string | null) =>
    formatLastUsedAtWithFormatter(lastUsedAt, formatter, {
      neverUsed: t("NeverUsed"),
      lessThanMinuteAgo: t("LessThanMinuteAgo"),
      lastUsed: (time) => t("LastUsed", { time }),
    });

  const handleCreated = useCallback((created: ApiKeyCreated) => {
    setApiKeys((prev) => [
      {
        id: created.id,
        label: created.label,
        permission: created.permission,
        keyPrefix: created.keyPrefix,
        lastUsedAt: created.lastUsedAt,
        createdAt: created.createdAt,
      },
      ...prev,
    ]);
  }, []);

  const openCreateModal = useCallback(() => {
    openApiKeyModal({
      t,
      onCreated: handleCreated,
      apiBaseUrl,
    });
  }, [apiBaseUrl, handleCreated, t]);

  const handleDelete = (key: ApiKeyListItem) => {
    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteTitle", { label: key.label })}
          icon={<IconAlertCircle size={24} />}
          isDangerous
        />
      ),
      message: <Text size="sm">{t("DeleteMessage")}</Text>,
      confirmLabel: tCommon("YesDelete"),
      cancelLabel: tCommon("NoCancel"),
      confirmColor: "red",
      confirmLeftSection: <IconTrash size={16} />,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(key.id);
        setApiKeys((prev) => prev.filter((item) => item.id !== key.id));
      },
    });
  };

  const createButton = (
    <Tooltip label={atLimit ? t("LimitReached") : undefined} disabled={!atLimit}>
      <span>
        <Button
          variant="outline"
          size="sm"
          leftSection={<IconPlus size={16} />}
          disabled={atLimit}
          onClick={openCreateModal}
        >
          {t("CreateButton")}
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <SettingsSection
      id="api-keys"
      icon={<IconKey size={20} stroke={1.5} />}
      title={t("Title")}
      helpDoc="api.authentication"
      helpLabel={t("DocsHelpLabel")}
      action={createButton}
    >
      <CardSection inheritPadding py="md">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t("Description")}
          </Text>

          {apiKeys.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("EmptyTitle")}
            </Text>
          ) : (
            <Stack gap="sm">
              {apiKeys.map((key) => (
                <ApiKeyRow
                  key={key.id}
                  apiKey={key}
                  permissionOptions={permissionOptions}
                  lastUsedLabel={lastUsedLabel(key.lastUsedAt)}
                  deleteAriaLabel={t("DeleteButton")}
                  onDelete={() => handleDelete(key)}
                  onLabelUpdated={(label) => {
                    setApiKeys((prev) =>
                      prev.map((item) => (item.id === key.id ? { ...item, label } : item)),
                    );
                  }}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </CardSection>
    </SettingsSection>
  );
}
