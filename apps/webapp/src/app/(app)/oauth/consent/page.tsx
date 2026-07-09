"use client";

import { errorNotificationTemplate } from "@bondery/mantine-next";
import {
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
import { IconCheck, IconShield, IconX } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";

function getOAuthRedirectUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidate = data as { redirect_to?: string; redirect_url?: string };
  return candidate.redirect_to ?? candidate.redirect_url ?? null;
}

/**
 * OAuth 2.1 Consent Page
 *
 * Displayed when a third-party app (e.g. the Chrome extension) initiates
 * an OAuth authorization flow. The user can approve or deny the request.
 *
 * URL: /oauth/consent?authorization_id=<id>
 */
export default function OAuthConsentPage() {
  const t = useWebTranslations("OAuthConsent");
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createBrowswerSupabaseClient();

  const authorizationId = searchParams.get("authorization_id");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authDetails, setAuthDetails] = useState<{
    client: { name: string };
    redirect_uri: string;
    scope: string;
  } | null>(null);
  const handledAuthorizationIdRef = useRef<string | null>(null);
  const redirectingRef = useRef(false);

  const fetchDetails = useCallback(async () => {
    if (!authorizationId) {
      setError(t("MissingAuthorizationId"));
      setLoading(false);
      return;
    }

    try {
      if (handledAuthorizationIdRef.current === authorizationId || redirectingRef.current) {
        return;
      }

      handledAuthorizationIdRef.current = authorizationId;
      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login, preserving authorization_id
        const consentPath = `/oauth/consent?authorization_id=${authorizationId}`;
        redirectingRef.current = true;
        router.push(`/login?redirect=${encodeURIComponent(consentPath)}`);
        return;
      }

      // Fetch authorization details
      const { data, error: detailsError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (detailsError || !data) {
        setError(detailsError?.message ?? t("InvalidRequest"));
        setLoading(false);
        return;
      }

      // If user already consented, data is an OAuthRedirect
      const preApprovedRedirect = getOAuthRedirectUrl(data);
      if (preApprovedRedirect) {
        redirectingRef.current = true;
        window.location.href = preApprovedRedirect;
        return;
      }
      const details = data as {
        client?: { name?: string };
        redirect_uri?: string;
        scope?: string;
      };
      setAuthDetails({
        client: { name: details.client?.name ?? "" },
        redirect_uri: details.redirect_uri ?? "",
        scope: details.scope ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("UnexpectedError"));
    } finally {
      if (!redirectingRef.current) {
        setLoading(false);
      }
    }
  }, [authorizationId, supabase, router, t]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  async function handleApprove() {
    if (!authorizationId) {
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: approveError } =
        await supabase.auth.oauth.approveAuthorization(authorizationId);
      if (approveError) {
        notifications.show(
          errorNotificationTemplate({
            description: approveError.message,
            title: t("ErrorTitle"),
          }),
        );
        return;
      }

      // Redirect back to the OAuth client with authorization result
      const redirectUrl = getOAuthRedirectUrl(data);
      if (redirectUrl) {
        redirectingRef.current = true;
        window.location.href = redirectUrl;
      } else {
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

  async function handleDeny() {
    if (!authorizationId) {
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: denyError } =
        await supabase.auth.oauth.denyAuthorization(authorizationId);
      if (denyError) {
        notifications.show(
          errorNotificationTemplate({
            description: denyError.message,
            title: t("ErrorTitle"),
          }),
        );
        return;
      }

      const redirectUrl = getOAuthRedirectUrl(data);
      if (redirectUrl) {
        redirectingRef.current = true;
        window.location.href = redirectUrl;
      } else {
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

  // Loading state
  if (loading) {
    return (
      <Center mih="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Error state
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

  // Parse scopes for display
  const scopes = authDetails.scope ? authDetails.scope.split(" ").filter(Boolean) : [];

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
                {authDetails.client.name}
              </Text>
            </Stack>
          </Group>

          <Text size="sm">{t("Description", { clientName: authDetails.client.name })}</Text>

          <Divider />

          {scopes.length > 0 && (
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
          )}

          <Group grow>
            <Button
              disabled={submitting}
              loading={submitting}
              onClick={handleDeny}
              variant="default"
            >
              {t("Deny")}
            </Button>
            <Button disabled={submitting} loading={submitting} onClick={handleApprove}>
              {t("Approve")}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Center>
  );
}
