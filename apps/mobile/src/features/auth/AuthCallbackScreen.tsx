import { getAuthUserFacingError } from "@bondery/helpers/api";
import { parseAuthCallbackSearch } from "@bondery/helpers/auth/parse-auth-callback-search";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { authClient } from "../../lib/auth/client";
import { ingestAuthCookieFromDeepLink } from "../../lib/auth/ingest-auth-cookie";
import {
  useCommonTranslations,
  useLoginPageTranslations,
  useMobileAuthTranslations,
} from "../../lib/i18n/generated/hooks";
import { notifications } from "../../lib/toast/notifications";
import { MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

const attemptedCallbackKeys = new Set<string>();

/** Expo Router can mount this route before query params hydrate. */
const EMPTY_CALLBACK_GRACE_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function AuthCallbackScreen() {
  const tMobileAuth = useMobileAuthTranslations();
  const tLoginPage = useLoginPageTranslations();
  const tCommon = useCommonTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const params = useLocalSearchParams<{
    cookie?: string | string[];
    error?: string | string[];
    token?: string | string[];
  }>();
  const parsed = parseAuthCallbackSearch(params);
  const toastedErrorRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const attemptKey = `${parsed.cookie ?? ""}|${parsed.token ?? ""}|${parsed.error ?? ""}`;

    const returnToLogin = () => {
      router.replace("/login");
    };

    const toastAuthError = (headline: string, description: string) => {
      const toastKey = `${headline}|${description}`;
      if (toastedErrorRef.current === toastKey) {
        return;
      }
      toastedErrorRef.current = toastKey;
      notifications.show({
        message: description,
        title: headline,
        type: "error",
      });
    };

    const failSignIn = (headline: string, description: string) => {
      toastAuthError(headline, description);
      returnToLogin();
    };

    const completeSignIn = async () => {
      if (!authClient) {
        if (active) {
          failSignIn(tLoginPage("AuthenticationError"), tMobileAuth("MissingConfig"));
        }
        return;
      }

      if (parsed.error) {
        if (active) {
          failSignIn(
            tLoginPage("AuthenticationError"),
            getAuthUserFacingError({ code: parsed.error }, tCommon),
          );
        }
        return;
      }

      if (parsed.cookie || parsed.token) {
        if (attemptedCallbackKeys.has(attemptKey)) {
          return;
        }
        attemptedCallbackKeys.add(attemptKey);
      } else {
        await delay(EMPTY_CALLBACK_GRACE_MS);
        if (!active) {
          return;
        }
      }

      try {
        if (parsed.cookie) {
          await ingestAuthCookieFromDeepLink(parsed.cookie);
          authClient.$store.notify("$sessionSignal");
        } else if (parsed.token) {
          const verified = await authClient.magicLink.verify({
            query: { token: parsed.token },
          });
          if (verified.error) {
            if (active) {
              failSignIn(
                tLoginPage("AuthenticationError"),
                getAuthUserFacingError(verified.error, tCommon),
              );
            }
            return;
          }
        }

        const { data, error } = await authClient.getSession();
        if (error) {
          if (active) {
            failSignIn(tLoginPage("AuthenticationError"), getAuthUserFacingError(error, tCommon));
          }
          return;
        }

        if (data?.session) {
          router.replace("/contacts");
          return;
        }

        if (active) {
          failSignIn(tLoginPage("InvalidLinkTitle"), tLoginPage("InvalidLinkBody"));
        }
      } catch (callbackError) {
        if (active) {
          failSignIn(
            tLoginPage("AuthenticationError"),
            getAuthUserFacingError(callbackError, tCommon),
          );
        }
      }
    };

    void completeSignIn();

    return () => {
      active = false;
    };
  }, [parsed.cookie, parsed.error, parsed.token, router, tCommon, tLoginPage, tMobileAuth]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <ActivityIndicator color={colors.textPrimary} size="large" />
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {tMobileAuth("CompletingLogin")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    textAlign: "center",
  },
});
