"use client";

import { DescribedSelect, errorNotificationTemplate } from "@bondery/mantine-next";
import { API_KEY_LIMITS, type ApiKeyCreated, type ApiKeyListItem } from "@bondery/schemas";
import { Button, CardSection, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconKey, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { InlineEditableInput } from "@/app/(app)/app/(shell)/person/[personId]/components/info/InlineEditableInput";
import { ensureFreshIdentity } from "@/lib/auth/reconfirm";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { formatLastUsedAtWithFormatter, useDateFormatter } from "@/lib/i18n/useDateFormatter";
import {
  useApiKeysQuery,
  useDeleteApiKeyMutation,
  useUpdateApiKeyLabelMutation,
} from "@/lib/query/hooks/useApiKeys";
import { useApiKeyPermissionOptions } from "../../hooks/useApiKeyPermissionOptions";
import { openRevokeApiKeyConfirm } from "../../settingsAuthActions";
import { openApiKeyModal } from "../modals/openApiKeyModal";
import { SettingsCredentialCard } from "./SettingsCredentialCard";
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
  const t = useSettingsPageTranslations("ApiKeys");
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
    <SettingsCredentialCard
      deleteAriaLabel={deleteAriaLabel}
      deleteTooltip={t("RevokeTooltip")}
      icon={<IconKey />}
      label={
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
      }
      lastUsedLabel={lastUsedLabel}
      onDelete={onDelete}
    >
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
    </SettingsCredentialCard>
  );
}

export function ApiKeysSection({ apiBaseUrl }: ApiKeysSectionProps) {
  const t = useSettingsPageTranslations("ApiKeys");
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

  const openCreateModal = useCallback(async () => {
    if (atLimit) {
      return;
    }
    const stepped = await ensureFreshIdentity({ purpose: "create_api_key" });
    if (stepped !== "fresh") {
      return;
    }
    openApiKeyModal({
      apiBaseUrl,
      onCreated: handleCreated,
    });
  }, [apiBaseUrl, atLimit, handleCreated]);

  const handleDelete = async (key: ApiKeyListItem) => {
    const stepped = await ensureFreshIdentity({
      purpose: "revoke_api_key",
      targetId: key.id,
    });
    if (stepped !== "fresh") {
      return;
    }
    openRevokeApiKeyConfirm({
      id: key.id,
      label: key.label,
      revokeApiKey: (id, stepUpToken) => deleteMutation.mutateAsync({ id, stepUpToken }),
      t,
      tCommon,
    });
  };

  const createButton = (
    <Tooltip disabled={!atLimit} label={atLimit ? t("LimitReached") : undefined}>
      <span>
        <Button
          disabled={atLimit}
          leftSection={<IconPlus size={16} />}
          onClick={() => void openCreateModal()}
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
                  onDelete={() => void handleDelete(key)}
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
