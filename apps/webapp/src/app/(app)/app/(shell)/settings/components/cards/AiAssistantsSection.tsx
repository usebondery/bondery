"use client";

import { CodeBlock, type CodeBlockSnippet, DescribedSelect } from "@bondery/mantine-next";
import type { McpConsentListItem } from "@bondery/schemas";
import { CardSection, Stack, Text } from "@mantine/core";
import { IconBraces, IconLink, IconSparkles } from "@tabler/icons-react";
import { useMemo } from "react";
import { mcpAccessFromScopes } from "@/lib/auth/mcp-access";
import { mcpAccessOptions } from "@/lib/auth/mcp-access-options";
import { ensureFreshIdentity } from "@/lib/auth/reconfirm";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter } from "@/lib/i18n/useDateFormatter";
import { useMcpConsentsQuery, useRevokeMcpConsentMutation } from "@/lib/query/hooks/useMcpConsents";
import { openRevokeMcpConsentConfirm } from "../../settingsAuthActions";
import { SettingsCredentialCard } from "./SettingsCredentialCard";
import { SettingsSection } from "./SettingsSection";

const PERMISSION_SELECT_WIDTH = 172;

interface AiAssistantsSectionProps {
  apiBaseUrl: string;
}

function mcpServerUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/+$/, "")}/mcp`;
}

function mcpJsonConfig(url: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        bondery: {
          type: "http",
          url,
        },
      },
    },
    null,
    2,
  );
}

export function AiAssistantsSection({ apiBaseUrl }: AiAssistantsSectionProps) {
  const t = useSettingsPageTranslations("AiAssistants");
  const tCommon = useCommonTranslations();
  const formatter = useDateFormatter();
  const { data: consents = [] } = useMcpConsentsQuery();
  const revokeMutation = useRevokeMcpConsentMutation();
  const url = mcpServerUrl(apiBaseUrl);
  const connectSnippets: CodeBlockSnippet[] = useMemo(
    () => [
      {
        code: url,
        icon: <IconLink size={14} />,
        id: "url",
        label: t("McpUrlLabel"),
        language: "plaintext",
      },
      {
        code: mcpJsonConfig(url),
        icon: <IconBraces size={14} />,
        id: "mcp-json",
        label: t("McpJsonLabel"),
        language: "json",
      },
    ],
    [t, url],
  );
  const permissionOptions = useMemo(
    () =>
      mcpAccessOptions({
        fullDescription: t("PermissionFullDescription"),
        fullLabel: t("PermissionFullLabel"),
        readDescription: t("PermissionReadDescription"),
        readLabel: t("PermissionReadLabel"),
      }),
    [t],
  );

  const handleRevoke = async (consent: McpConsentListItem) => {
    const stepped = await ensureFreshIdentity({
      purpose: "revoke_mcp_consent",
      targetId: consent.id,
    });
    if (stepped !== "fresh") {
      return;
    }
    openRevokeMcpConsentConfirm({
      clientName: consent.clientName,
      id: consent.id,
      revokeConsent: (id, stepUpToken) => revokeMutation.mutateAsync({ id, stepUpToken }),
      t,
      tCommon,
    });
  };

  return (
    <SettingsSection
      helpDoc="bondery.mcp"
      helpLabel={t("DocsHelpLabel")}
      icon={<IconSparkles size={20} stroke={1.5} />}
      id="ai-assistants"
      title={t("Title")}
    >
      <CardSection inheritPadding py="md">
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            {t("Description")}
          </Text>

          <CodeBlock
            copiedLabel={t("CopiedButton")}
            copyLabel={t("CopyButton")}
            defaultSnippetId="url"
            snippets={connectSnippets}
          />

          {consents.length === 0 ? (
            <Text c="dimmed" size="sm">
              {t("EmptyTitle")}
            </Text>
          ) : (
            <Stack gap="sm">
              {consents.map((consent) => (
                <SettingsCredentialCard
                  deleteAriaLabel={t("RevokeButton")}
                  deleteTooltip={t("RevokeTooltip")}
                  icon={<IconSparkles />}
                  key={consent.id}
                  label={consent.clientName}
                  lastUsedLabel={t("GrantedAt", {
                    time: formatter.dateTime(new Date(consent.createdAt), {
                      dateStyle: "medium",
                    }),
                  })}
                  onDelete={() => void handleRevoke(consent)}
                >
                  <DescribedSelect
                    aria-label={t("PermissionField")}
                    data={permissionOptions}
                    disabled
                    miw={PERMISSION_SELECT_WIDTH}
                    onChange={() => {}}
                    style={{ flexShrink: 0 }}
                    value={mcpAccessFromScopes(consent.scopes)}
                    w={PERMISSION_SELECT_WIDTH}
                  />
                </SettingsCredentialCard>
              ))}
            </Stack>
          )}
        </Stack>
      </CardSection>
    </SettingsSection>
  );
}
