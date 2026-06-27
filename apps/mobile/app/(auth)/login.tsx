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
import { IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react-native";
import * as ExpoLinking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { useMobileTranslations } from "../../src/lib/i18n/useMobileTranslations";
import { supabase } from "../../src/lib/supabase/client";
import { WEBSITE_URL } from "../../src/lib/config";
import { OAUTH_PROVIDER_COLORS } from "../../src/theme/colors";
import { MOBILE_TYPOGRAPHY } from "../../src/theme/tokens";
import { useMobileThemeColors } from "../../src/theme/useMobileThemeColors";

type Provider = "github" | "linkedin_oidc";

const PROVIDERS: Array<{
  provider: Provider;
  labelKey: "SettingsPage.Integration.GitHub" | "SettingsPage.Integration.LinkedIn";
  Icon: typeof IconBrandGithub;
  backgroundColor: string;
  pressedBackgroundColor: string;
  textColor: string;
}> = [
  {
    provider: "github",
    labelKey: "SettingsPage.Integration.GitHub",
    Icon: IconBrandGithub,
    backgroundColor: OAUTH_PROVIDER_COLORS.github.background,
    pressedBackgroundColor: OAUTH_PROVIDER_COLORS.github.backgroundPress,
    textColor: OAUTH_PROVIDER_COLORS.github.text,
  },
  {
    provider: "linkedin_oidc",
    labelKey: "SettingsPage.Integration.LinkedIn",
    Icon: IconBrandLinkedin,
    backgroundColor: OAUTH_PROVIDER_COLORS.linkedin.background,
    pressedBackgroundColor: OAUTH_PROVIDER_COLORS.linkedin.backgroundPress,
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
      setError(t("MobileApp.Auth.MissingConfig"));
      return;
    }

    setError(null);
    setLoadingProvider(provider);

    try {
      const redirectTo = getCallbackUrl();

      if (Platform.OS === "web") {
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });

        if (signInError) {
          throw signInError;
        }

        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (signInError) {
        throw signInError;
      }

      if (!data?.url) {
        throw new Error(t("MobileApp.Auth.MissingAuthUrl"));
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== "success" || !result.url) {
        setError(t("MobileApp.Auth.LoginCancelled"));
        return;
      }

      const responseUrl = new URL(result.url);
      const code = responseUrl.searchParams.get("code") || "";
      const authError =
        responseUrl.searchParams.get("error_description") ||
        responseUrl.searchParams.get("error") ||
        "";

      router.replace({
        pathname: "/auth/callback",
        params: {
          code,
          error: authError,
        },
      });
    } catch (oauthError) {
      setError(
        oauthError instanceof Error ? oauthError.message : t("LoginPage.UnexpectedErrorMessage"),
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.logo, { color: colors.textPrimary }]}>Bondery</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{t("LoginPage.Description")}</Text>

        <View style={styles.providers}>
          {PROVIDERS.map(({ provider, labelKey, Icon, backgroundColor, pressedBackgroundColor, textColor }) => {
            const isLoading = loadingProvider === provider;

            return (
              <Pressable
                key={provider}
                onPress={() => startOAuth(provider)}
                style={({ pressed }) => [
                  styles.providerButton,
                  {
                    backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
                  },
                  Boolean(loadingProvider) && styles.providerButtonDisabled,
                ]}
                disabled={Boolean(loadingProvider)}
              >
                <View style={styles.providerContent}>
                  <View style={styles.providerIconSection}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color={textColor} />
                    ) : (
                      <Icon size={18} color={textColor} />
                    )}
                  </View>
                  <Text style={[styles.providerText, { color: textColor }]}>
                    {t("LoginPage.ContinueWith").replace("{provider}", t(labelKey))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.termsText, { color: colors.textMuted }]}>
          {t("LoginPage.TermsAgreement")}{" "}
          <Text
            style={[styles.link, { color: colors.primary }]}
            onPress={() => Linking.openURL(`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`)}
          >
            {t("LoginPage.TermsOfService")}
          </Text>{" "}
          {t("LoginPage.And")}{" "}
          <Text
            style={[styles.link, { color: colors.primary }]}
            onPress={() => Linking.openURL(`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`)}
          >
            {t("LoginPage.PrivacyPolicy")}
          </Text>
        </Text>

        {error ? <Text style={[styles.errorText, { color: colors.dangerText }]}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  logo: {
    fontSize: 30,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
  },
  providers: {
    gap: 10,
  },
  providerButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  providerButtonDisabled: {
    opacity: 0.72,
  },
  providerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerIconSection: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  providerText: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  termsText: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    textDecorationLine: "underline",
  },
  errorText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
  },
});
