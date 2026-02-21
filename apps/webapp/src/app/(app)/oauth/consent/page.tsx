"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Text,
  Button,
  Stack,
  Card,
  Group,
  Loader,
  Center,
  ThemeIcon,
  List,
  ListItem,
  Divider,
} from "@mantine/core";
import { IconShield, IconX, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { errorNotificationTemplate } from "@bondery/mantine-next";

/**
 * OAuth 2.1 Consent Page
 *
 * Displayed when a third-party app (e.g. the Chrome extension) initiates
 * an OAuth authorization flow. The user can approve or deny the request.
 *
 * URL: /oauth/consent?authorization_id=<id>
 */
export default function OAuthConsentPage() {
  const t = useTranslations("OAuthConsent");
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

  const fetchDetails = useCallback(async () => {
    if (!authorizationId) {
      setError(t("MissingAuthorizationId"));
      setLoading(false);
      return;
    }

    try {
      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login, preserving authorization_id
        router.push(`/login?redirect=/oauth/consent?authorization_id=${authorizationId}`);
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

      // If user already consented, data is an OAuthRedirect with redirect_url
      if ("redirect_url" in data) {
        window.location.href = (data as { redirect_url: string }).redirect_url;
        return;
      }

      setAuthDetails(data as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("UnexpectedError"));
    } finally {
      setLoading(false);
    }
  }, [authorizationId, supabase, router, t]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  async function handleApprove() {
    if (!authorizationId) return;
    setSubmitting(true);

    try {
      const { data, error: approveError } =
        await supabase.auth.oauth.approveAuthorization(authorizationId);

      if (approveError) {
        notifications.show(
          errorNotificationTemplate({
            title: t("ErrorTitle"),
            description: approveError.message,
            
          }),
        );
        return;
      }

      // Redirect back to the client with the authorization code
      if ((data as any)?.redirect_url) {
        window.location.href = (data as any).redirect_url;
      }
    } catch (err) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: err instanceof Error ? err.message : t("UnexpectedError"),
          
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeny() {
    if (!authorizationId) return;
    setSubmitting(true);

    try {
      const { data, error: denyError } =
        await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (denyError) {
        notifications.show(
          errorNotificationTemplate({
            title: t("ErrorTitle"),
            description: denyError.message,
            
          }),
        );
        return;
      }

      if ((data as any)?.redirect_url) {
        window.location.href = (data as any).redirect_url;
      }
    } catch (err) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: err instanceof Error ? err.message : t("UnexpectedError"),
          
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
        <Card p="xl" maw={480} w="100%" shadow="sm">
          <Stack gap="md" align="center">
            <ThemeIcon size={48} radius="xl" color="red" variant="light">
              <IconX size={24} />
            </ThemeIcon>
            <Text size="lg" fw={600}>
              {t("ErrorTitle")}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {error ?? t("InvalidRequest")}
            </Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  // Parse scopes for display
  const scopes = authDetails.scope
    ? authDetails.scope.split(" ").filter(Boolean)
    : [];

  return (
    <Center mih="100vh">
      <Card p="xl" maw={480} w="100%" shadow="sm">
        <Stack gap="lg">
          <Group gap="sm" align="center">
            <ThemeIcon size={40} radius="xl" variant="light">
              <IconShield size={22} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="lg" fw={600}>
                {t("Title")}
              </Text>
              <Text size="sm" c="dimmed">
                {authDetails.client.name}
              </Text>
            </Stack>
          </Group>

          <Text size="sm">{t("Description", { clientName: authDetails.client.name })}</Text>

          <Divider />

          {scopes.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {t("RequestedPermissions")}
              </Text>
              <List size="sm" spacing="xs">
                {scopes.map((scope) => (
                  <ListItem
                    key={scope}
                    icon={
                      <ThemeIcon size={20} radius="xl" variant="light" color="blue">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    {t(`Scopes.${scope}`, { defaultValue: scope })}
                  </ListItem>
                ))}
              </List>
            </Stack>
          )}

          <Group grow>
            <Button
              variant="default"
              onClick={handleDeny}
              loading={submitting}
              disabled={submitting}
            >
              {t("Deny")}
            </Button>
            <Button onClick={handleApprove} loading={submitting} disabled={submitting}>
              {t("Approve")}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Center>
  );
}
