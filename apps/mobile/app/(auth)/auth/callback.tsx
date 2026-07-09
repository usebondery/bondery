import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMobileTranslations } from "../../../src/lib/i18n/useMobileTranslations";
import { supabase } from "../../../src/lib/supabase/client";
import { MOBILE_TYPOGRAPHY } from "../../../src/theme/tokens";
import { useMobileThemeColors } from "../../../src/theme/useMobileThemeColors";

export default function AuthCallbackScreen() {
  const t = useMobileTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const completeSignIn = async () => {
      if (!supabase) {
        if (active) {
          setStatusError(t("MissingConfig", { ns: "MobileAuth" }));
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
          router.replace("/contacts");
        } else if (active) {
          setStatusError(t("MissingCode", { ns: "MobileAuth" }));
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

      router.replace("/contacts");
    };

    completeSignIn();

    return () => {
      active = false;
    };
  }, [params.code, params.error, router, t]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ActivityIndicator color={colors.textPrimary} size="large" />
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {t("CompletingLogin", { ns: "MobileAuth" })}
      </Text>
      {statusError ? (
        <Text style={[styles.error, { color: colors.dangerText }]}>{statusError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    textAlign: "center",
  },
  screen: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
