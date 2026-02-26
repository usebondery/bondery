import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase/client";
import { useMobileTranslations } from "../../src/lib/i18n/useMobileTranslations";

export default function AuthCallbackScreen() {
  const t = useMobileTranslations();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const completeSignIn = async () => {
      if (!supabase) {
        if (active) {
          setStatusError(t("MobileApp.Auth.MissingConfig"));
        }
        return;
      }

      if (params.error) {
        if (active) {
          setStatusError(params.error);
        }
        return;
      }

      const code = params.code || "";

      if (!code) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/(tabs)/contacts");
        } else if (active) {
          setStatusError(t("MobileApp.Auth.MissingCode"));
        }
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        if (active) {
          setStatusError(error.message);
        }
        return;
      }

      router.replace("/(tabs)/contacts");
    };

    completeSignIn();

    return () => {
      active = false;
    };
  }, [params.code, params.error, router, t]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator size="large" color="#111827" />
      <Text style={styles.title}>{t("MobileApp.Auth.CompletingLogin")}</Text>
      {statusError ? <Text style={styles.error}>{statusError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
  },
  error: {
    color: "#b91c1c",
    textAlign: "center",
  },
});
