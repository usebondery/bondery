"use client";

import { DescribedSelect, errorNotificationTemplate, ModalTitle } from "@bondery/mantine-next";
import { API_KEY_LIMITS, type ApiKeyCreated, type ApiKeyListItem } from "@bondery/schemas";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { InlineEditableInput } from "@/app/(app)/app/person/[personId]/components/info/InlineEditableInput";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { formatLastUsedAtWithFormatter, useDateFormatter } from "@/lib/i18n/useDateFormatter";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import {
  useApiKeysQuery,
  useDeleteApiKeyMutation,
  useUpdateApiKeyLabelMutation,
} from "@/lib/query/hooks/useApiKeys";
import { useApiKeyPermissionOptions } from "../hooks/useApiKeyPermissionOptions";
import { openApiKeyModal } from "./openApiKeyModal";
import { SettingsSection } from "./SettingsSection";

interface ApiKeysSectionProps {
  apiBaseUrl: string;
}

interface ApiKeyRowProps {
  apiKey: ApiKeyListItem;
  deleteAriaLabel: string;
  lastUsedLabel: string;
  onDelete: () => void;
  onLabelUpdated: (label: string) => void;
  permissionOptions: ReturnType<typeof useApiKeyPermissionOptions>;
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
  const t = useWebTranslations("SettingsPage", "ApiKeys");
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
          description: t("EditErrorDescription"),
          title: t("EditErrorTitle"),
        }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [apiKey.id, label, onLabelUpdated, t, updateMutation]);

  return (
    <Card padding="sm" radius="md" withBorder>
      <Group align="center" gap="sm" wrap="nowrap">
        <ThemeIcon color="gray" radius="md" size="lg" variant="light">
          <IconKey size={18} stroke={1.5} />
        </ThemeIcon>

        <Box style={{ flex: 1, minWidth: 120 }}>
          <InlineEditableInput
            aria-label={t("LabelField")}
            isSaving={isSaving}
            maxLength={API_KEY_LIMITS.labelMaxLength}
            onBlur={() => void saveLabel()}
            onChange={setLabel}
            size="sm"
            style={{ width: "100%" }}
            value={label}
          />
        </Box>

        <DescribedSelect
          aria-label={t("PermissionField")}
          data={permissionOptions}
          disabled
          miw={PERMISSION_SELECT_WIDTH}
          onChange={() => {}}
          style={{ flexShrink: 0 }}
          value={apiKey.permission}
          w={PERMISSION_SELECT_WIDTH}
        />

        <Text
          c="dimmed"
          ff="monospace"
          size="xs"
          style={{ flexShrink: 0 }}
          truncate
          w={KEY_PREFIX_COLUMN_WIDTH}
        >
          {apiKey.keyPrefix}
        </Text>

        <Text c="dimmed" size="xs" style={{ flexShrink: 0 }} truncate w={LAST_USED_COLUMN_WIDTH}>
          {lastUsedLabel}
        </Text>

        <ActionIcon
          aria-label={deleteAriaLabel}
          color="red"
          onClick={onDelete}
          size="sm"
          style={{ flexShrink: 0 }}
          variant="subtle"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Card>
  );
}

export function ApiKeysSection({ apiBaseUrl }: ApiKeysSectionProps) {
  const t = useWebTranslations("SettingsPage", "ApiKeys");
  const tCommon = useCommonTranslations();
  const formatter = useDateFormatter();
  const { data: apiKeys = [] } = useApiKeysQuery();
  const deleteMutation = useDeleteApiKeyMutation();

  const atLimit = apiKeys.length >= API_KEY_LIMITS.maxPerUser;
  const permissionOptions = useApiKeyPermissionOptions();

  const lastUsedLabel = (lastUsedAt: string | null) =>
    formatLastUsedAtWithFormatter(lastUsedAt, formatter, {
      lastUsed: (time) => t("LastUsed", { time }),
      lessThanMinuteAgo: t("LessThanMinuteAgo"),
      neverUsed: t("NeverUsed"),
    });

  const handleCreated = useCallback((_created: ApiKeyCreated) => {}, []);

  const openCreateModal = useCallback(() => {
    openApiKeyModal({
      apiBaseUrl,
      onCreated: handleCreated,
    });
  }, [apiBaseUrl, handleCreated]);

  const handleDelete = (key: ApiKeyListItem) => {
    openStandardConfirmModal({
      cancelLabel: tCommon("confirm.noCancel"),
      confirmColor: "red",
      confirmLabel: tCommon("confirm.yesDelete"),
      confirmLeftSection: <IconTrash size={16} />,
      message: <Text size="sm">{t("DeleteMessage")}</Text>,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(key.id);
      },
      title: (
        <ModalTitle
          icon={<IconAlertCircle size={24} />}
          isDangerous
          text={t("DeleteTitle", { label: key.label })}
        />
      ),
    });
  };

  const createButton = (
    <Tooltip disabled={!atLimit} label={atLimit ? t("LimitReached") : undefined}>
      <span>
        <Button
          disabled={atLimit}
          leftSection={<IconPlus size={16} />}
          onClick={openCreateModal}
          size="sm"
          variant="outline"
        >
          {t("CreateButton")}
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <SettingsSection
      action={createButton}
      helpDoc="api.authentication"
      helpLabel={t("DocsHelpLabel")}
      icon={<IconKey size={20} stroke={1.5} />}
      id="api-keys"
      title={t("Title")}
    >
      <CardSection inheritPadding py="md">
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            {t("Description")}
          </Text>

          {apiKeys.length === 0 ? (
            <Text c="dimmed" size="sm">
              {t("EmptyTitle")}
            </Text>
          ) : (
            <Stack gap="sm">
              {apiKeys.map((key) => (
                <ApiKeyRow
                  apiKey={key}
                  deleteAriaLabel={t("DeleteButton")}
                  key={key.id}
                  lastUsedLabel={lastUsedLabel(key.lastUsedAt)}
                  onDelete={() => handleDelete(key)}
                  onLabelUpdated={() => {}}
                  permissionOptions={permissionOptions}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </CardSection>
    </SettingsSection>
  );
}
