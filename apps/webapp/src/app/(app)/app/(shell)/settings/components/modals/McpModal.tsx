"use client";

import { AnthropicIcon } from "@bondery/branding/react";
import { docHref } from "@bondery/helpers";
import { getUserFacingError } from "@bondery/helpers/api";
import {
  ButtonLink,
  CodeBlock,
  type CodeBlockSnippet,
  DescribedSelect,
  faviconUrlForHost,
  hrefAssert,
  linkHostname,
  ModalFooter,
  ModalScrollLayout,
} from "@bondery/mantine-next";
import type { McpConsentListItem } from "@bondery/schemas";
import type { TranslateFn } from "@bondery/translations";
import { Anchor, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconBraces, IconLink, IconSparkles } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { mcpAccessFromScopes } from "@/lib/auth/mcp-access";
import { mcpAccessOptions } from "@/lib/auth/mcp-access-options";
import { ensureFreshIdentity } from "@/lib/auth/reconfirm";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter } from "@/lib/i18n/useDateFormatter";
import { useModalDismiss } from "@/lib/modals";
import { useMcpConsentsQuery, useRevokeMcpConsentMutation } from "@/lib/query/hooks/useMcpConsents";
import { openRevokeMcpConsentConfirm } from "../../settingsAuthActions";
import { SettingsCredentialCard } from "../cards/SettingsCredentialCard";
import {
  SETTINGS_CREDENTIAL_ICON_PX,
  SettingsCredentialIconImg,
} from "../cards/SettingsCredentialIconImg";

const PERMISSION_SELECT_WIDTH = 172;

interface McpModalProps {
  apiBaseUrl: string;
  modalId: string;
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

function clientFaviconSrc(logoUri: string): string | null {
  const host = linkHostname(logoUri);
  return host ? faviconUrlForHost(host) : null;
}

/** Host favicon. The raw logo host is outside the page image policy. */
function McpClientRowIcon({ logoUri }: { logoUri: string | null }) {
  const src = logoUri ? clientFaviconSrc(logoUri) : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return <IconSparkles size={SETTINGS_CREDENTIAL_ICON_PX} stroke={1.5} />;
  }

  return (
    <SettingsCredentialIconImg
      onError={() => {
        setFailedSrc(src);
      }}
      src={src}
    />
  );
}

export function McpModal({ apiBaseUrl, modalId }: McpModalProps) {
  const t = useSettingsPageTranslations("AiAssistants");
  const tCommon = useCommonTranslations();
  const formatter = useDateFormatter();
  const { closeModal } = useModalDismiss(modalId, false);
  const consentsQuery = useMcpConsentsQuery();
  const revokeMutation = useRevokeMcpConsentMutation();
  const url = mcpServerUrl(apiBaseUrl);
  const connectSnippets: CodeBlockSnippet[] = [
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
  ];
  const permissionOptions = mcpAccessOptions({
    fullDescription: t("PermissionFullDescription"),
    fullLabel: t("PermissionFullLabel"),
    readDescription: t("PermissionReadDescription"),
    readLabel: t("PermissionReadLabel"),
  });
  const consents = consentsQuery.data;
  const docsUrl = docHref("bondery.mcp");

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
    <ModalScrollLayout
      footer={<ModalFooter cancelLabel={tCommon("a11y.close")} mt={0} onCancel={closeModal} />}
    >
      <Stack gap="md">
        <Text c="dimmed" size="sm">
          {t("Description")}
        </Text>

        <ButtonLink
          href={hrefAssert(docHref("apps.mcp-server"))}
          leftSection={<AnthropicIcon color="white" size={16} />}
          rel="noopener noreferrer"
          size="sm"
          target="_blank"
          w="fit-content"
        >
          {t("AddToClaudeButton")}
        </ButtonLink>

        <Stack gap={4}>
          <CodeBlock
            copiedLabel={t("CopiedButton")}
            copyLabel={t("CopyButton")}
            defaultSnippetId="url"
            snippets={connectSnippets}
          />
          <Anchor href={docsUrl} rel="noopener noreferrer" size="sm" target="_blank">
            {t("LearnMoreMcpDocs")}
          </Anchor>
        </Stack>

        <Stack gap="sm">
          <Text fw={500} size="sm">
            {t("ClientsLabel")}
          </Text>
          <McpClientRegion
            consents={consents}
            error={consentsQuery.error}
            isError={consentsQuery.isError}
            onRetry={() => {
              void consentsQuery.refetch();
            }}
            t={t}
            tCommon={tCommon}
          >
            {consents?.map((consent) => (
              <SettingsCredentialCard
                deleteAriaLabel={t("RevokeButton")}
                deleteTooltip={t("RevokeTooltip")}
                icon={<McpClientRowIcon logoUri={consent.logoUri} />}
                key={consent.id}
                label={consent.clientName}
                lastUsedLabel={t("GrantedAt", {
                  time: formatter.formatDate(new Date(consent.createdAt), "medium"),
                })}
                onDelete={() => {
                  void handleRevoke(consent);
                }}
                stackBelowSm
              >
                <DescribedSelect
                  aria-label={t("PermissionField")}
                  data={permissionOptions}
                  disabled
                  miw={{ base: 0, sm: PERMISSION_SELECT_WIDTH }}
                  onChange={() => {}}
                  style={{ flexShrink: 0 }}
                  value={mcpAccessFromScopes(consent.scopes)}
                  w={{ base: "100%", sm: PERMISSION_SELECT_WIDTH }}
                />
              </SettingsCredentialCard>
            ))}
          </McpClientRegion>
        </Stack>
      </Stack>
    </ModalScrollLayout>
  );
}

function McpClientRegion({
  children,
  consents,
  error,
  isError,
  onRetry,
  t,
  tCommon,
}: {
  children: ReactNode;
  consents: McpConsentListItem[] | undefined;
  error: unknown;
  isError: boolean;
  onRetry: () => void;
  t: TranslateFn<"SettingsPage", "AiAssistants">;
  tCommon: TranslateFn<"common">;
}) {
  if (consents && consents.length > 0) {
    return <Stack gap="sm">{children}</Stack>;
  }

  if (consents) {
    return (
      <Text c="dimmed" size="sm">
        {t("EmptyTitle")}
      </Text>
    );
  }

  if (isError) {
    return (
      <Stack gap="xs">
        <Text size="sm">{getUserFacingError(error, tCommon)}</Text>
        <Button onClick={onRetry} size="xs" variant="light">
          {tCommon("actions.retry")}
        </Button>
      </Stack>
    );
  }

  return (
    <Center>
      <Loader aria-label={tCommon("a11y.loading")} />
    </Center>
  );
}
