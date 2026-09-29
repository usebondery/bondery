"use client";

import { BETTER_AUTH_BASE_PATH } from "@bondery/helpers/globals/paths";
import { DescribedSelect, errorNotificationTemplate } from "@bondery/mantine-next";
import {
  Alert,
  Button,
  Card,
  Center,
  Divider,
  Group,
  List,
  ListItem,
  Loader,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCheck, IconShield, IconX } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWebappAuthClient } from "@/lib/auth/client";
import { buildOAuthLoginHref } from "@/lib/auth/magic-link-urls";
import type { McpAccessLevel } from "@/lib/auth/mcp-access";
import { mcpAccessOptions } from "@/lib/auth/mcp-access-options";
import {
  isFirstPartyOAuthClient,
  readOAuthPublicClientName,
  redirectUriIsLoopback,
  resolveFirstPartyConsentClientName,
  resolveThirdPartyConsentClientDisplay,
} from "@/lib/auth/oauth-consent-client";
import { resolveOAuthConsentRequestDetails } from "@/lib/auth/oauth-consent-request";
import { buildSignedOAuthQuery } from "@/lib/auth/signedOAuthQuery";
import { useOAuthConsentTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";

function getRedirectUri(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidate = data as { redirect_uri?: string; redirect_to?: string; url?: string };
  return candidate.redirect_uri ?? candidate.redirect_to ?? candidate.url ?? null;
}

function splitScopes(scope: string): string[] {
  return scope.split(" ").filter(Boolean);
}

function grantedMcpScope(requested: string[], permission: McpAccessLevel): string {
  const keep = new Set(["openid", "profile", "email", "offline_access", "mcp:read"]);
  if (permission === "full") {
    keep.add("mcp:write");
  }
  return requested.filter((scope) => keep.has(scope)).join(" ");
}

async function fetchOAuthPublicClientName(
  apiBaseUrl: string,
  clientId: string,
  oauthQuery: string,
): Promise<string | null> {
  try {
    const prelogin = await fetch(
      `${apiBaseUrl}${BETTER_AUTH_BASE_PATH}/oauth2/public-client-prelogin`,
      {
        body: JSON.stringify({ client_id: clientId, oauth_query: oauthQuery }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    if (prelogin.ok) {
      return readOAuthPublicClientName(await prelogin.json());
    }
  } catch {
    // Session GET is the fallback when prelogin is unavailable.
  }

  try {
    const publicClient = await fetch(
      `${apiBaseUrl}${BETTER_AUTH_BASE_PATH}/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
      { credentials: "include" },
    );
    if (publicClient.ok) {
      return readOAuthPublicClientName(await publicClient.json());
    }
  } catch {
    return null;
  }

  return null;
}

type OAuthConsentClientProps = {
  chromeExtensionClientId: string;
  webappClientId: string;
};

/**
 * OAuth 2.1 consent page for the API authorization server (Better Auth).
 *
 * The AS redirects here with a signed `oauth_query` continuation on the URL.
 */
export function OAuthConsentClient({
  chromeExtensionClientId,
  webappClientId,
}: OAuthConsentClientProps) {
  const t = useOAuthConsentTranslations();
  const searchParams = useSearchParams();
  const runtimeConfig = useWebappRuntimeConfig();
  const authClient = useMemo(() => createWebappAuthClient(runtimeConfig), [runtimeConfig]);
  const apiBaseUrl = runtimeConfig.apiBaseUrl.replace(/\/+$/, "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authDetails, setAuthDetails] = useState<{
    client: { hostname?: string; name: string };
    isLoopback: boolean;
    isMcp: boolean;
    redirect_uri: string;
    scope: string;
  } | null>(null);
  const [permission, setPermission] = useState<McpAccessLevel>("read");
  const handledRef = useRef(false);
  const redirectingRef = useRef(false);

  const oauthQuery = useMemo(
    () => buildSignedOAuthQuery(searchParams.toString()) ?? "",
    [searchParams],
  );
  const requestedScopes = useMemo(
    () => (authDetails ? splitScopes(authDetails.scope) : []),
    [authDetails],
  );
  const canOfferWrite = requestedScopes.includes("mcp:write");
  const permissionOptions = useMemo(
    () =>
      mcpAccessOptions({
        fullDescription: t("PermissionFullDescription"),
        fullLabel: t("PermissionFullLabel"),
        readDescription: t("PermissionReadDescription"),
        readLabel: t("PermissionReadLabel"),
      }).map((option) =>
        option.value === "full" && !canOfferWrite ? { ...option, disabled: true } : option,
      ),
    [canOfferWrite, t],
  );

  const fetchDetails = useCallback(async () => {
    if (!oauthQuery) {
      setError(t("MissingAuthorizationId"));
      setLoading(false);
      return;
    }

    if (handledRef.current || redirectingRef.current) {
      return;
    }

    handledRef.current = true;

    try {
      const session = await authClient.getSession();
      if (!session.data?.user) {
        redirectingRef.current = true;
        window.location.replace(buildOAuthLoginHref(window.location.search));
        return;
      }

      const request = resolveOAuthConsentRequestDetails(searchParams.toString());
      if (!request) {
        setError(t("InvalidRequest"));
        setLoading(false);
        return;
      }

      const requestedScopes = splitScopes(request.scope);
      const isMcp = requestedScopes.includes("mcp:read") || requestedScopes.includes("mcp:write");
      const firstPartyIds = { chromeExtensionClientId, webappClientId };
      const isLoopback = redirectUriIsLoopback(request.redirectUri);

      if (isFirstPartyOAuthClient(request.clientId, firstPartyIds)) {
        setAuthDetails({
          client: {
            name: resolveFirstPartyConsentClientName(request.clientId, {
              ...firstPartyIds,
              chromeExtensionName: t("ChromeExtensionClientName"),
              unknownName: t("UnknownClientName"),
              webappName: t("WebappClientName"),
            }),
          },
          isLoopback,
          isMcp,
          redirect_uri: request.redirectUri,
          scope: request.scope,
        });
        return;
      }

      let fetchedName: string | null = null;
      try {
        fetchedName = await fetchOAuthPublicClientName(apiBaseUrl, request.clientId, oauthQuery);
      } catch {
        fetchedName = null;
      }

      setAuthDetails({
        client: resolveThirdPartyConsentClientDisplay(
          request.clientId,
          fetchedName,
          t("UnknownClientName"),
        ),
        isLoopback,
        isMcp,
        redirect_uri: request.redirectUri,
        scope: request.scope,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("UnexpectedError"));
    } finally {
      if (!redirectingRef.current) {
        setLoading(false);
      }
    }
  }, [
    apiBaseUrl,
    authClient,
    chromeExtensionClientId,
    oauthQuery,
    searchParams,
    t,
    webappClientId,
  ]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  async function submitConsent(accept: boolean) {
    if (!oauthQuery || !authDetails) {
      return;
    }

    setSubmitting(true);
    try {
      const requested = splitScopes(authDetails.scope);
      const body: Record<string, unknown> = {
        accept,
        oauth_query: oauthQuery,
      };
      if (accept && authDetails.isMcp) {
        body.scope = grantedMcpScope(requested, permission);
      }

      const response = await fetch(`${apiBaseUrl}${BETTER_AUTH_BASE_PATH}/oauth2/consent`, {
        body: JSON.stringify(body),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? t("ErrorTitle"));
      }

      const data = await response.json();
      const redirectUrl = getRedirectUri(data);
      if (redirectUrl) {
        redirectingRef.current = true;
        window.location.href = redirectUrl;
      }
    } catch (err) {
      notifications.show(
        errorNotificationTemplate({
          description: err instanceof Error ? err.message : t("UnexpectedError"),
          title: t("ErrorTitle"),
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error || !authDetails) {
    return (
      <Center mih="100vh">
        <Card maw={480} p="xl" shadow="sm" w="100%">
          <Stack align="center" gap="md">
            <ThemeIcon color="red" radius="xl" size={48} variant="light">
              <IconX size={24} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              {t("ErrorTitle")}
            </Text>
            <Text c="dimmed" size="sm" ta="center">
              {error ?? t("InvalidRequest")}
            </Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  const scopes = requestedScopes;
  const displayName = authDetails.client.name;
  const hostname = authDetails.client.hostname;

  return (
    <Center mih="100vh">
      <Card maw={480} p="xl" shadow="sm" w="100%">
        <Stack gap="lg">
          <Group align="center" gap="sm">
            <ThemeIcon radius="xl" size={40} variant="light">
              <IconShield size={22} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={600} size="lg">
                {t("Title")}
              </Text>
              <Text c="dimmed" size="sm">
                {hostname ?? displayName}
              </Text>
            </Stack>
          </Group>

          <Text size="sm">{t("Description", { clientName: displayName })}</Text>

          {authDetails.isLoopback ? (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />} variant="light">
              {t("LoopbackWarning")}
            </Alert>
          ) : null}

          <Divider />

          {authDetails.isMcp ? (
            <DescribedSelect
              allowDeselect={false}
              data={permissionOptions}
              disabled={submitting}
              label={t("PermissionLabel")}
              onChange={(value) => setPermission(value === "full" ? "full" : "read")}
              value={permission}
            />
          ) : scopes.length > 0 ? (
            <Stack gap="xs">
              <Text fw={500} size="sm">
                {t("RequestedPermissions")}
              </Text>
              <List size="sm" spacing="xs">
                {scopes.map((scope) => (
                  <ListItem
                    icon={
                      <ThemeIcon color="blue" radius="xl" size={20} variant="light">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                    key={scope}
                  >
                    {t(`Scopes.${scope}`, { defaultValue: scope })}
                  </ListItem>
                ))}
              </List>
            </Stack>
          ) : null}

          <Group grow>
            <Button
              disabled={submitting}
              loading={submitting}
              onClick={() => submitConsent(false)}
              variant="default"
            >
              {t("Deny")}
            </Button>
            <Button disabled={submitting} loading={submitting} onClick={() => submitConsent(true)}>
              {t("Approve")}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Center>
  );
}
