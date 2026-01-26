"use client";

import { useState } from "react";
import { Text, Button, Stack, Anchor, Card } from "@mantine/core";
import { IconBrandGithubFilled, IconBrandLinkedin, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { INTEGRATION_PROVIDERS, WEBSITE_URL } from "@/lib/config";
import { Logo } from "./components/Logo";
import { WEBSITE_ROUTES } from "@bondery/helpers";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const [loading, setLoading] = useState(false);
  const supabase = createBrowswerSupabaseClient();

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/auth/callback`,
        },
      });

      if (error) {
        notifications.show({
          title: t("AuthenticationError"),
          message: error.message,
          color: "red",
          icon: <IconX size={18} />,
        });
      }
    } catch (err) {
      notifications.show({
        title: t("UnexpectedError"),
        message: err instanceof Error ? err.message : t("UnexpectedErrorMessage"),
        color: "red",
        icon: <IconX size={18} />,
      });
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
            <Anchor component={Link} href={`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`} size="xs">
              {t("TermsOfService")}
            </Anchor>{" "}
            {t("And")}{" "}
            <Anchor component={Link} href={`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`} size="xs">
              {t("PrivacyPolicy")}
            </Anchor>
          </Text>
        </Stack>
      </Card>
    </div>
  );
}
