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
import { useMobileTranslations } from "../src/lib/i18n/useMobileTranslations";
import { supabase } from "../src/lib/supabase/client";
import { WEBSITE_URL } from "../src/lib/config";

type Provider = "github" | "linkedin_oidc";

const PROVIDERS: Array<{
  provider: Provider;
  labelKey: "SettingsPage.Integration.GitHub" | "SettingsPage.Integration.LinkedIn";
  Icon: typeof IconBrandGithub;
}> = [
  {
    provider: "github",
    labelKey: "SettingsPage.Integration.GitHub",
    Icon: IconBrandGithub,
  },
  {
    provider: "linkedin_oidc",
    labelKey: "SettingsPage.Integration.LinkedIn",
    Icon: IconBrandLinkedin,
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
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.logo}>Bondery</Text>
        <Text style={styles.description}>{t("LoginPage.Description")}</Text>

        <View style={styles.providers}>
          {PROVIDERS.map(({ provider, labelKey, Icon }) => {
            const isLoading = loadingProvider === provider;

            return (
              <Pressable
                key={provider}
                onPress={() => startOAuth(provider)}
                style={styles.providerButton}
                disabled={Boolean(loadingProvider)}
              >
                <View style={styles.providerContent}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Icon size={18} />
                  )}
                  <Text style={styles.providerText}>
                    {t("LoginPage.ContinueWith").replace("{provider}", t(labelKey))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.termsText}>
          {t("LoginPage.TermsAgreement")}{" "}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL(`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`)}
          >
            {t("LoginPage.TermsOfService")}
          </Text>{" "}
          {t("LoginPage.And")}{" "}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL(`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`)}
          >
            {t("LoginPage.PrivacyPolicy")}
          </Text>
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    gap: 14,
  },
  logo: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },
  description: {
    textAlign: "center",
    color: "#374151",
    fontSize: 15,
  },
  providers: {
    gap: 10,
  },
  providerButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  providerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  providerText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  termsText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    color: "#111827",
    textDecorationLine: "underline",
  },
  errorText: {
    marginTop: 6,
    textAlign: "center",
    color: "#b91c1c",
    fontSize: 12,
  },
});
