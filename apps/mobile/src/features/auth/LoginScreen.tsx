import { getAuthUserFacingError } from "@bondery/helpers/api";
import {
  isEmailSignInEnabled,
  isOAuthProviderEnabled,
} from "@bondery/helpers/auth/oauth-providers";
import { firstSearchParam } from "@bondery/helpers/auth/parse-auth-callback-search";
import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { loginEmailFormSchema } from "@bondery/schemas";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Anchor } from "../../components/ui/Anchor";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import {
  authClient,
  hydrateLastLoginMethod,
  nativeAuthDeepLink,
  rememberLastLoginMethod,
} from "../../lib/auth/client";
import {
  classifyPasskeyCeremonyError,
  nativePasskeyLoginMessage,
} from "../../lib/auth/passkey-ceremony";
import { WEBSITE_URL } from "../../lib/config";
import {
  useCommonTranslations,
  useLoginPageTranslations,
  useMobileAuthTranslations,
} from "../../lib/i18n/generated/hooks";
import { notifications } from "../../lib/toast/notifications";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { BonderyLoginLogotype } from "./BonderyLoginLogotype";
import { LoginEmailPanel } from "./LoginEmailPanel";
import { LoginProviderList } from "./LoginProviderList";
import {
  fetchOAuthProvidersBitmap,
  type LoginBusyAction,
  type LoginOAuthProvider,
} from "./loginOAuth";
import { loginScreenStyles as styles } from "./loginScreenStyles";

const RESEND_SECONDS = 30;
const SESSION_POLL_MS = 4_000;

export default function LoginScreen() {
  const colors = useMobileThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ error?: string | string[] }>();
  const tLoginPage = useLoginPageTranslations();
  const tMobileAuth = useMobileAuthTranslations();
  const tCommon = useCommonTranslations();
  const shownQueryErrorRef = useRef<string | null>(null);
  const [busyAction, setBusyAction] = useState<LoginBusyAction>(null);
  const [oauthProviders, setOAuthProviders] = useState<OAuthProvidersBitmap | null>(null);
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [lastUsedLoginMethod, setLastUsedLoginMethod] = useState<string | null>(
    () => authClient?.getLastUsedLoginMethod() ?? null,
  );

  const emailValid = loginEmailFormSchema.safeParse({ email }).success;
  const emailSignInEnabled = isEmailSignInEnabled(oauthProviders);
  const isBusy = busyAction !== null;
  const isEmailBusy = busyAction === "email";
  const emailContinueDisabled = isBusy && !isEmailBusy;
  const emailSendDisabled =
    !emailSignInEnabled ||
    (awaitingVerify ? resendSeconds > 0 : !emailValid) ||
    (isBusy && !isEmailBusy);

  function showAuthError(headline: string, description: string) {
    notifications.show({
      message: description,
      title: headline,
      type: "error",
    });
  }

  useEffect(() => {
    const client = authClient;
    if (!client) {
      return;
    }

    void hydrateLastLoginMethod().then(() => {
      setLastUsedLoginMethod(client.getLastUsedLoginMethod());
    });
  }, []);

  useEffect(() => {
    if (authClient) {
      return;
    }

    showAuthError(tLoginPage("AuthenticationError"), tMobileAuth("MissingConfig"));
  }, [authClient, tLoginPage, tMobileAuth]);

  useEffect(() => {
    let cancelled = false;

    void fetchOAuthProvidersBitmap().then((bitmap) => {
      if (!cancelled) {
        setOAuthProviders(bitmap);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const queryError = firstSearchParam(params.error);
    if (!queryError || shownQueryErrorRef.current === queryError) {
      return;
    }

    shownQueryErrorRef.current = queryError;
    showAuthError(
      tLoginPage("AuthenticationError"),
      getAuthUserFacingError({ code: queryError }, tCommon),
    );
  }, [params.error, tCommon, tLoginPage]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => {
      clearTimeout(timeout);
    };
  }, [resendSeconds]);

  useEffect(() => {
    const client = authClient;
    if (!awaitingVerify || !client) {
      return;
    }

    const poll = setInterval(() => {
      void client.getSession().then(({ data }) => {
        if (data?.session) {
          router.replace("/contacts");
        }
      });
    }, SESSION_POLL_MS);

    return () => {
      clearInterval(poll);
    };
  }, [awaitingVerify, router]);

  const notifyPasskeyError = (passkeyError: unknown) => {
    const message = nativePasskeyLoginMessage(classifyPasskeyCeremonyError(passkeyError), {
      noPasskeyFound: tLoginPage("NoPasskeyFound"),
      passkeySignInFailed: tLoginPage("PasskeySignInFailed"),
      passkeysUnavailableOnDevice: tMobileAuth("PasskeysUnavailableOnDevice"),
      passkeyTimedOut: tLoginPage("PasskeyTimedOut"),
    });
    if (message) {
      showAuthError(tLoginPage("AuthenticationError"), message);
    }
  };

  const startOAuth = async (provider: LoginOAuthProvider) => {
    if (!isOAuthProviderEnabled(oauthProviders, provider) || isBusy) {
      return;
    }

    if (!authClient) {
      showAuthError(tLoginPage("AuthenticationError"), tMobileAuth("MissingConfig"));
      return;
    }

    setBusyAction(provider);

    try {
      const { error: signInError } = await authClient.signIn.social({
        callbackURL: nativeAuthDeepLink("auth/callback"),
        errorCallbackURL: nativeAuthDeepLink("login"),
        provider,
      });

      if (signInError) {
        showAuthError(
          tLoginPage("AuthenticationError"),
          getAuthUserFacingError(signInError, tCommon),
        );
        return;
      }

      const session = await authClient.getSession();
      if (session.data?.session) {
        await rememberLastLoginMethod(provider);
        router.replace("/contacts");
      }
    } catch (oauthError) {
      showAuthError(tLoginPage("UnexpectedError"), getAuthUserFacingError(oauthError, tCommon));
    } finally {
      setBusyAction(null);
    }
  };

  const startPasskey = async () => {
    if (isBusy) {
      return;
    }

    if (!authClient) {
      showAuthError(tLoginPage("AuthenticationError"), tMobileAuth("MissingConfig"));
      return;
    }

    setBusyAction("passkey");

    try {
      const { data, error: passkeyError } = await authClient.signIn.passkey();
      if (passkeyError) {
        notifyPasskeyError(passkeyError);
        return;
      }

      if (data?.session) {
        router.replace("/contacts");
        return;
      }

      const session = await authClient.getSession();
      if (session.data?.session) {
        router.replace("/contacts");
        return;
      }

      showAuthError(tLoginPage("AuthenticationError"), tLoginPage("PasskeySignInFailed"));
    } catch (passkeyError) {
      notifyPasskeyError(passkeyError);
    } finally {
      setBusyAction(null);
    }
  };

  const submitMagicLink = async () => {
    if (emailSendDisabled) {
      return;
    }

    const address = awaitingVerify ? sentEmail : email;
    const parsed = loginEmailFormSchema.safeParse({ email: address });
    if (!parsed.success) {
      return;
    }

    if (!authClient) {
      showAuthError(tLoginPage("AuthenticationError"), tMobileAuth("MissingConfig"));
      return;
    }

    setBusyAction("email");

    try {
      const { error: magicLinkError } = await authClient.signIn.magicLink({
        callbackURL: nativeAuthDeepLink("auth/callback"),
        email: parsed.data.email,
        errorCallbackURL: nativeAuthDeepLink("login"),
      });

      if (magicLinkError) {
        showAuthError(
          tLoginPage("AuthenticationError"),
          getAuthUserFacingError(magicLinkError, tCommon),
        );
        return;
      }

      setSentEmail(parsed.data.email);
      setEmail("");
      setAwaitingVerify(true);
      setResendSeconds(RESEND_SECONDS);
      notifications.show({
        message: tLoginPage("CheckYourEmailBody", { email: parsed.data.email }),
        title: tLoginPage("CheckYourEmail"),
        type: "success",
      });
    } catch (magicLinkError) {
      showAuthError(tLoginPage("UnexpectedError"), getAuthUserFacingError(magicLinkError, tCommon));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.primary,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <BonderyLoginLogotype accessibilityLabel={tLoginPage("LogoAriaLabel")} />
        </View>

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            style={styles.flex}
          >
            <View style={styles.sheetGroup}>
              <View style={styles.sheetHeading}>
                <Heading order={2}>{tLoginPage("FormTitle")}</Heading>
                <Text c="secondary" size="lg">
                  {tLoginPage("Description")}
                </Text>
              </View>

              {emailPanelOpen ? (
                <LoginEmailPanel
                  awaitingVerify={awaitingVerify}
                  email={email}
                  emailSendDisabled={emailSendDisabled}
                  isBusy={isBusy}
                  isEmailBusy={isEmailBusy}
                  lastUsedLoginMethod={lastUsedLoginMethod}
                  onBack={() => setEmailPanelOpen(false)}
                  onChangeEmail={setEmail}
                  onSubmit={() => {
                    void submitMagicLink();
                  }}
                  resendSeconds={resendSeconds}
                />
              ) : (
                <LoginProviderList
                  busyAction={busyAction}
                  emailContinueDisabled={emailContinueDisabled}
                  emailSignInEnabled={emailSignInEnabled}
                  lastUsedLoginMethod={lastUsedLoginMethod}
                  oauthProviders={oauthProviders}
                  onContinueEmail={() => {
                    setEmailPanelOpen(true);
                  }}
                  onOAuth={(provider) => {
                    void startOAuth(provider);
                  }}
                  onPasskey={() => {
                    void startPasskey();
                  }}
                  onUnavailableToast={(description) => {
                    showAuthError(tLoginPage("AuthenticationError"), description);
                  }}
                />
              )}

              <Text c="muted" className="leading-[18px]" size="xs" style={styles.terms}>
                {tLoginPage("TermsAgreement")}{" "}
                <Anchor href={`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`} size="xs">
                  {tLoginPage("TermsOfService")}
                </Anchor>{" "}
                {tLoginPage("And")}{" "}
                <Anchor href={`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`} size="xs">
                  {tLoginPage("PrivacyPolicy")}
                </Anchor>
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
