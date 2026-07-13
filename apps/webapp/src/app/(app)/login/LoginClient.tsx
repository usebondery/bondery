"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { AnchorLink, errorNotificationTemplate } from "@bondery/mantine-next";
import { Button, Card, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandGithubFilled, IconBrandLinkedin } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { setLocalePreferencesCookie } from "@/lib/auth/detectLocale";
import { useCommonTranslations, useLoginPageTranslations } from "@/lib/i18n/generated/hooks";
import { INTEGRATION_PROVIDERS } from "@/lib/platform/config";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";
import { Logo } from "./components/Logo";

export function LoginClient() {
  const t = useLoginPageTranslations();
  const tCommon = useCommonTranslations();
  const [loading, setLoading] = useState(false);
  const runtimeConfig = useWebappRuntimeConfig();
  const supabase = useMemo(() => createBrowswerSupabaseClient(runtimeConfig), [runtimeConfig]);
  const searchParams = useSearchParams();
  const { webappUrl, websiteUrl } = runtimeConfig;

  // Preserve redirect parameter for post-login navigation (e.g., OAuth consent flow)
  const redirectParam = searchParams.get("redirect");
  const shouldForceDesktopLoginLayout = redirectParam?.startsWith("/oauth/consent") ?? false;

  const getProviderIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<{ size?: number }>> = {
      github: IconBrandGithubFilled,
      linkedin: IconBrandLinkedin,
    };
    return icons[iconName] || IconBrandGithubFilled;
  };

  const activeProviders = INTEGRATION_PROVIDERS.filter((p) => p.active).sort((a, b) => {
    if (a.providerKey === "linkedin_oidc" && b.providerKey !== "linkedin_oidc") {
      return -1;
    }
    if (b.providerKey === "linkedin_oidc" && a.providerKey !== "linkedin_oidc") {
      return 1;
    }
    return 0;
  });

  const handleOAuthLogin = async (provider: "github" | "linkedin_oidc") => {
    try {
      setLoading(true);

      // Store detected timezone & time format in a short-lived cookie
      // so the auth callback can apply them to the new user's settings
      await setLocalePreferencesCookie();

      // Build callback URL, including the redirect param if present
      let callbackUrl = `${webappUrl.replace(/\/$/, "")}/auth/callback`;
      if (redirectParam) {
        callbackUrl += `?redirect=${encodeURIComponent(redirectParam)}`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        options: {
          redirectTo: callbackUrl,
        },
        provider,
      });

      if (error) {
        notifications.show(
          errorNotificationTemplate({
            description: tCommon("errors.unknown"),
            title: t("AuthenticationError"),
          }),
        );
      }
    } catch (err) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(err, tCommon),
          title: t("UnexpectedError"),
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center ">
      <Card className="max-w-md" p="xl">
        {!shouldForceDesktopLoginLayout && (
          <Stack align="center" gap="lg" hiddenFrom="sm">
            <Logo href={websiteUrl} size={60} />
            <Stack align="center" gap="0">
              <Text fw={600} size="lg" ta="center">
                {t("MobileNotAvailable")}
              </Text>
              <Text c="dimmed" size="md" ta="center">
                {t("MobileNotAvailableMessage")}
              </Text>
            </Stack>
          </Stack>
        )}
        <Stack
          align="center"
          gap="md"
          {...(!shouldForceDesktopLoginLayout ? { visibleFrom: "sm" } : {})}
        >
          <Logo href={websiteUrl} size={60} />
          <Text size="md" ta="center">
            {t("Description")}
          </Text>

          <Stack gap="xs" w="100%">
            {activeProviders.map((provider) => {
              const IconComponent = getProviderIcon(provider.icon);
              return (
                <Button
                  color={provider.backgroundColor}
                  fullWidth
                  key={provider.provider}
                  leftSection={<IconComponent size={20} />}
                  loading={loading}
                  onClick={() =>
                    handleOAuthLogin(provider.providerKey as "github" | "linkedin_oidc")
                  }
                  size="lg"
                >
                  {t("ContinueWith", { provider: provider.displayName })}
                </Button>
              );
            })}
          </Stack>
          <Text c="dimmed" size="xs" ta="center">
            {t("TermsAgreement")}{" "}
            <AnchorLink href={`${websiteUrl}${WEBSITE_ROUTES.TERMS}`} size="xs">
              {t("TermsOfService")}
            </AnchorLink>{" "}
            {t("And")}{" "}
            <AnchorLink href={`${websiteUrl}${WEBSITE_ROUTES.PRIVACY}`} size="xs">
              {t("PrivacyPolicy")}
            </AnchorLink>
          </Text>
        </Stack>
      </Card>
    </div>
  );
}
