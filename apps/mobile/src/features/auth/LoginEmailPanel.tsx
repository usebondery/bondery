import { IconMailForward } from "@tabler/icons-react-native";
import { View } from "react-native";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { isLastUsedMagicLink } from "../../lib/auth/last-login-method";
import { useCommonTranslations, useLoginPageTranslations } from "../../lib/i18n/generated/hooks";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { loginScreenStyles as styles } from "./loginScreenStyles";

type LoginEmailPanelProps = {
  awaitingVerify: boolean;
  email: string;
  emailSendDisabled: boolean;
  isBusy: boolean;
  isEmailBusy: boolean;
  lastUsedLoginMethod: string | null;
  onBack: () => void;
  onChangeEmail: (value: string) => void;
  onSubmit: () => void;
  resendSeconds: number;
};

export function LoginEmailPanel({
  awaitingVerify,
  email,
  emailSendDisabled,
  isBusy,
  isEmailBusy,
  lastUsedLoginMethod,
  onBack,
  onChangeEmail,
  onSubmit,
  resendSeconds,
}: LoginEmailPanelProps) {
  const colors = useMobileThemeColors();
  const tLoginPage = useLoginPageTranslations();
  const tCommon = useCommonTranslations();
  const sendLabel =
    resendSeconds > 0
      ? tLoginPage("ResendInSeconds", { seconds: resendSeconds })
      : awaitingVerify
        ? tLoginPage("ResendSignInLink")
        : tLoginPage("SendLoginLink");

  return (
    <View style={styles.emailPanel}>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        autoFocus
        editable={!isBusy}
        keyboardType="email-address"
        label={tLoginPage("EmailLabel")}
        onChangeText={onChangeEmail}
        onSubmitEditing={onSubmit}
        placeholder={tLoginPage("EmailPlaceholder")}
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
      />
      <Button
        cornerLabel={isLastUsedMagicLink(lastUsedLoginMethod) ? tLoginPage("LastUsed") : undefined}
        disabled={emailSendDisabled}
        leftSection={<IconMailForward color={colors.textOnPrimary} size={18} />}
        loading={isEmailBusy}
        loadingText={tLoginPage("LoadingSendLoginLink")}
        onPress={onSubmit}
        size="lg"
      >
        {sendLabel}
      </Button>
      <Button disabled={isBusy} onPress={onBack} variant="subtle">
        {tCommon("actions.back")}
      </Button>
    </View>
  );
}
