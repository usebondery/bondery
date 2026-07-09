import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react-native";
import * as ExpoLinking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WEBSITE_URL } from "../../src/lib/config";
import { useMobileTranslations } from "../../src/lib/i18n/useMobileTranslations";
import { supabase } from "../../src/lib/supabase/client";
import { OAUTH_PROVIDER_COLORS } from "../../src/theme/colors";
import { MOBILE_TYPOGRAPHY } from "../../src/theme/tokens";
import { useMobileThemeColors } from "../../src/theme/useMobileThemeColors";

type Provider = "github" | "linkedin_oidc";

const PROVIDERS: Array<{
  provider: Provider;
  labelKey: "Providers.GitHub" | "Providers.LinkedIn";
  Icon: typeof IconBrandGithub;
  backgroundColor: string;
  pressedBackgroundColor: string;
  textColor: string;
}> = [
  {
    backgroundColor: OAUTH_PROVIDER_COLORS.github.background,
    Icon: IconBrandGithub,
    labelKey: "Providers.GitHub",
    pressedBackgroundColor: OAUTH_PROVIDER_COLORS.github.backgroundPress,
    provider: "github",
    textColor: OAUTH_PROVIDER_COLORS.github.text,
  },
  {
    backgroundColor: OAUTH_PROVIDER_COLORS.linkedin.background,
    Icon: IconBrandLinkedin,
    labelKey: "Providers.LinkedIn",
    pressedBackgroundColor: OAUTH_PROVIDER_COLORS.linkedin.backgroundPress,
    provider: "linkedin_oidc",
    textColor: OAUTH_PROVIDER_COLORS.linkedin.text,
  },
];

function getCallbackUrl() {
  if (Platform.OS === "web") {
    return `${window.location.origin}/auth/callback`;
  }

  return ExpoLinking.createURL("auth/callback");
}

export default function LoginScreen() {
  const t = useMobileTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startOAuth = async (provider: Provider) => {
    if (!supabase) {
      setError(t("MissingConfig", { ns: "MobileAuth" }));
      return;
    }

    setError(null);
    setLoadingProvider(provider);

    try {
      const redirectTo = getCallbackUrl();

      if (Platform.OS === "web") {
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          options: { redirectTo },
          provider,
        });

        if (signInError) {
          throw signInError;
        }

        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
        provider,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data?.url) {
        throw new Error(t("MissingAuthUrl", { ns: "MobileAuth" }));
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== "success" || !result.url) {
        setError(t("LoginCancelled", { ns: "MobileAuth" }));
        return;
      }

      const responseUrl = new URL(result.url);
      const code = responseUrl.searchParams.get("code") || "";
      const authError =
        responseUrl.searchParams.get("error_description") ||
        responseUrl.searchParams.get("error") ||
        "";

      router.replace({
        params: {
          code,
          error: authError,
        },
        pathname: "/auth/callback",
      });
    } catch (oauthError) {
      setError(
        oauthError instanceof Error
          ? oauthError.message
          : t("UnexpectedErrorMessage", { ns: "LoginPage" }),
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>Bondery</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t("Description", { ns: "LoginPage" })}
        </Text>

        <View style={styles.providers}>
          {PROVIDERS.map(
            ({ provider, labelKey, Icon, backgroundColor, pressedBackgroundColor, textColor }) => {
              const isLoading = loadingProvider === provider;

              return (
                <Pressable
                  disabled={Boolean(loadingProvider)}
                  key={provider}
                  onPress={() => startOAuth(provider)}
                  style={({ pressed }) => [
                    styles.providerButton,
                    {
                      backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
                    },
                    Boolean(loadingProvider) && styles.providerButtonDisabled,
                  ]}
                >
                  <View style={styles.providerContent}>
                    <View style={styles.providerIconSection}>
                      {isLoading ? (
                        <ActivityIndicator color={textColor} size="small" />
                      ) : (
                        <Icon color={textColor} size={18} />
                      )}
                    </View>
                    <Text style={[styles.providerText, { color: textColor }]}>
                      {t("ContinueWith", { ns: "LoginPage" }).replace(
                        "{provider}",
                        t(labelKey, { ns: "LoginPage" }),
                      )}
                    </Text>
                  </View>
                </Pressable>
              );
            },
          )}
        </View>

        <Text style={[styles.termsText, { color: colors.textMuted }]}>
          {t("TermsAgreement", { ns: "LoginPage" })}{" "}
          <Text
            onPress={() => Linking.openURL(`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`)}
            style={[styles.link, { color: colors.primary }]}
          >
            {t("TermsOfService", { ns: "LoginPage" })}
          </Text>{" "}
          {t("And", { ns: "LoginPage" })}{" "}
          <Text
            onPress={() => Linking.openURL(`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`)}
            style={[styles.link, { color: colors.primary }]}
          >
            {t("PrivacyPolicy", { ns: "LoginPage" })}
          </Text>
        </Text>

        {error ? (
          <Text style={[styles.errorText, { color: colors.dangerText }]}>{error}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    maxWidth: 440,
    padding: 20,
    width: "100%",
  },
  description: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  link: {
    textDecorationLine: "underline",
  },
  logo: {
    fontSize: 30,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    textAlign: "center",
  },
  providerButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  providerButtonDisabled: {
    opacity: 0.72,
  },
  providerContent: {
    alignItems: "center",
    flexDirection: "row",
  },
  providerIconSection: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    width: 20,
  },
  providers: {
    gap: 10,
  },
  providerText: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
