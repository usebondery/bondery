import {
  areAllOAuthProvidersDisabled,
  isOAuthProviderEnabled,
} from "@bondery/helpers/auth/oauth-providers";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { IconFingerprint, IconMail } from "@tabler/icons-react-native";
import { View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Text } from "../../components/ui/Text";
import {
  isLastUsedMagicLink,
  isLastUsedOAuthProvider,
  isLastUsedPasskey,
} from "../../lib/auth/last-login-method";
import { useLoginPageTranslations } from "../../lib/i18n/generated/hooks";
import { OAUTH_PROVIDER_COLORS } from "../../theme/colors";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import type { LoginBusyAction, LoginOAuthProvider } from "./loginOAuth";
import { LOGIN_OAUTH_PROVIDERS } from "./loginOAuth";
import { loginScreenStyles as styles } from "./loginScreenStyles";

type LoginProviderListProps = {
  busyAction: LoginBusyAction;
  emailContinueDisabled: boolean;
  emailSignInEnabled: boolean;
  lastUsedLoginMethod: string | null;
  oauthProviders: OAuthProvidersBitmap | null;
  onContinueEmail: () => void;
  onOAuth: (provider: LoginOAuthProvider) => void;
  onPasskey: () => void;
  onUnavailableToast: (description: string) => void;
};

export function LoginProviderList({
  busyAction,
  emailContinueDisabled,
  emailSignInEnabled,
  lastUsedLoginMethod,
  oauthProviders,
  onContinueEmail,
  onOAuth,
  onPasskey,
  onUnavailableToast,
}: LoginProviderListProps) {
  const colors = useMobileThemeColors();
  const tLoginPage = useLoginPageTranslations();
  const allOAuthDisabled = areAllOAuthProvidersDisabled(oauthProviders);
  const passkeyColors = OAUTH_PROVIDER_COLORS.passkey;
  const passkeyDisabled = busyAction !== null && busyAction !== "passkey";
  const lastUsedLabel = tLoginPage("LastUsed");
  const magicLinkIsLastUsed = isLastUsedMagicLink(lastUsedLoginMethod);
  const passkeyIsLastUsed = isLastUsedPasskey(lastUsedLoginMethod) && !magicLinkIsLastUsed;

  return (
    <View style={styles.providers}>
      {allOAuthDisabled ? (
        <Text c="muted" size="xs" style={styles.unavailableText}>
          {tLoginPage("ProvidersUnavailable")}
        </Text>
      ) : null}

      {LOGIN_OAUTH_PROVIDERS.map(
        ({ provider, labelKey, Icon, backgroundColor, pressedBackgroundColor, textColor }) => {
          const isLoading = busyAction === provider;
          const enabled = isOAuthProviderEnabled(oauthProviders, provider);
          const busyElsewhere = busyAction !== null && !isLoading;
          const unavailableLabel = tLoginPage("ProviderUnavailable", {
            provider: tLoginPage(labelKey),
          });
          const isLastUsed =
            enabled &&
            !passkeyIsLastUsed &&
            !magicLinkIsLastUsed &&
            isLastUsedOAuthProvider(lastUsedLoginMethod, provider);

          return (
            <Button
              accessibilityHint={enabled ? undefined : unavailableLabel}
              color={backgroundColor}
              cornerLabel={isLastUsed ? lastUsedLabel : undefined}
              disabled={busyElsewhere}
              inactive={!enabled}
              key={provider}
              leftSection={<Icon color={textColor} size={18} />}
              loading={isLoading}
              loadingText={tLoginPage("LoadingContinueWith", { provider: tLoginPage(labelKey) })}
              onPress={() => {
                if (!enabled) {
                  onUnavailableToast(unavailableLabel);
                  return;
                }
                onOAuth(provider);
              }}
              pressedColor={pressedBackgroundColor}
              size="lg"
              textColor={textColor}
            >
              {tLoginPage("ContinueWith", { provider: tLoginPage(labelKey) })}
            </Button>
          );
        },
      )}

      <Button
        color={passkeyColors.background}
        cornerLabel={passkeyIsLastUsed ? lastUsedLabel : undefined}
        disabled={passkeyDisabled}
        leftSection={<IconFingerprint color={passkeyColors.text} size={18} />}
        loading={busyAction === "passkey"}
        loadingText={tLoginPage("LoadingContinueWithPasskey")}
        onPress={onPasskey}
        pressedColor={passkeyColors.backgroundPress}
        size="lg"
        textColor={passkeyColors.text}
      >
        {tLoginPage("ContinueWithPasskey")}
      </Button>

      <Button
        accessibilityHint={emailSignInEnabled ? undefined : tLoginPage("EmailSignInUnavailable")}
        cornerLabel={magicLinkIsLastUsed ? lastUsedLabel : undefined}
        disabled={emailContinueDisabled}
        inactive={!emailSignInEnabled}
        leftSection={<IconMail color={colors.textOnPrimary} size={18} />}
        onPress={() => {
          if (!emailSignInEnabled) {
            onUnavailableToast(tLoginPage("EmailSignInUnavailable"));
            return;
          }
          onContinueEmail();
        }}
        size="lg"
      >
        {tLoginPage("ContinueWithEmail")}
      </Button>
    </View>
  );
}
