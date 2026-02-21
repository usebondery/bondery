"use client";

import { useState } from "react";
import { Text, Button, Stack, Card } from "@mantine/core";
import { IconBrandGithubFilled, IconBrandLinkedin, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { INTEGRATION_PROVIDERS, WEBSITE_URL } from "@/lib/config";
import { Logo } from "./components/Logo";
import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { AnchorLink, errorNotificationTemplate } from "@bondery/mantine-next";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const [loading, setLoading] = useState(false);
  const supabase = createBrowswerSupabaseClient();
  const searchParams = useSearchParams();

  // Preserve redirect parameter for post-login navigation (e.g., OAuth consent flow)
  const redirectParam = searchParams.get("redirect") ?? searchParams.get("returnUrl");

  const getProviderIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<{ size?: number }>> = {
      github: IconBrandGithubFilled,
      linkedin: IconBrandLinkedin,
    };
    return icons[iconName] || IconBrandGithubFilled;
  };

  const activeProviders = INTEGRATION_PROVIDERS.filter((p) => p.active);

  const handleOAuthLogin = async (provider: "github" | "linkedin_oidc") => {
    try {
      setLoading(true);

      // Build callback URL, including the redirect param if present
      let callbackUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/auth/callback`;
      if (redirectParam) {
        callbackUrl += `?redirect=${encodeURIComponent(redirectParam)}`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        notifications.show(
          errorNotificationTemplate({
            title: t("AuthenticationError"),
            description: error.message,
            
          }),
        );
      }
    } catch (err) {
      notifications.show(
        errorNotificationTemplate({
          title: t("UnexpectedError"),
          description: err instanceof Error ? err.message : t("UnexpectedErrorMessage"),
          
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center ">
      <Card p="xl" className="max-w-md">
        <Stack gap="lg" align="center" hiddenFrom="md">
          <Logo size={60} href={WEBSITE_URL} />
          <Stack gap="0" align="center">
            <Text size="lg" fw={600} ta="center">
              {t("MobileNotAvailable")}
            </Text>
            <Text size="md" c="dimmed" ta="center">
              {t("MobileNotAvailableMessage")}
            </Text>
          </Stack>
        </Stack>
        <Stack gap="md" align="center" visibleFrom="md">
          <Logo size={60} href={WEBSITE_URL} />
          <Text size="md" ta="center">
            {t("Description")}
          </Text>

          <Stack gap="xs" w="100%">
            {activeProviders.map((provider) => {
              const IconComponent = getProviderIcon(provider.icon);
              return (
                <Button
                  key={provider.provider}
                  size="lg"
                  leftSection={<IconComponent size={20} />}
                  onClick={() =>
                    handleOAuthLogin(provider.providerKey as "github" | "linkedin_oidc")
                  }
                  loading={loading}
                  fullWidth
                  color={provider.backgroundColor}
                >
                  {t("ContinueWith", { provider: provider.displayName })}
                </Button>
              );
            })}
          </Stack>
          <Text size="xs" c="dimmed" ta="center">
            {t("TermsAgreement")}{" "}
            <AnchorLink href={`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`} size="xs">
              {t("TermsOfService")}
            </AnchorLink>{" "}
            {t("And")}{" "}
            <AnchorLink href={`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`} size="xs">
              {t("PrivacyPolicy")}
            </AnchorLink>
          </Text>
        </Stack>
      </Card>
    </div>
  );
}
