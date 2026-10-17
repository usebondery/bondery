import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { IconMail, IconMessage, IconPhone } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useCommonTranslations, useContactInfoTranslations } from "@/lib/i18n/generated/hooks";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { contactDetailScreenStyles as styles } from "./contactDetailScreenStyles";

interface ContactDetailQuickActionsProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  emails: EmailEntry[];
  onOpenEmail: (email: EmailEntry) => void;
  onOpenPhone: (phone: PhoneEntry) => void;
  onOpenSms: (phone: PhoneEntry) => void;
  phones: PhoneEntry[];
}

function QuickActionButton({
  accessibilityLabel,
  children,
  onPress,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  onPress: () => void;
}) {
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("default");

  return (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.actionButton}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function ContactDetailQuickActions({
  colors,
  emails,
  onOpenEmail,
  onOpenPhone,
  onOpenSms,
  phones,
}: ContactDetailQuickActionsProps) {
  const tContactInfo = useContactInfoTranslations();
  const t = useCommonTranslations();

  if (phones.length === 0 && emails.length === 0) {
    return null;
  }

  const primaryPhone = phones.find((phone) => phone.preferred) ?? phones[0];
  const primaryEmail = emails.find((email) => email.preferred) ?? emails[0];

  return (
    <View
      className="mb-6 flex-row justify-center gap-4 border-b pb-6"
      style={{ borderBottomColor: colors.border }}
    >
      {phones.length > 0 ? (
        <QuickActionButton
          accessibilityLabel={t("actions.call")}
          onPress={() => {
            if (primaryPhone) {
              onOpenPhone(primaryPhone);
            }
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfacePressed }]}>
            <IconPhone size={20} stroke={colors.iconPrimary} />
          </View>
        </QuickActionButton>
      ) : null}
      {phones.length > 0 ? (
        <QuickActionButton
          accessibilityLabel={t("actions.message")}
          onPress={() => {
            if (primaryPhone) {
              onOpenSms(primaryPhone);
            }
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfacePressed }]}>
            <IconMessage size={20} stroke={colors.iconPrimary} />
          </View>
        </QuickActionButton>
      ) : null}
      {emails.length > 0 ? (
        <QuickActionButton
          accessibilityLabel={tContactInfo("SendEmailAction")}
          onPress={() => {
            if (primaryEmail) {
              onOpenEmail(primaryEmail);
            }
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfacePressed }]}>
            <IconMail size={20} stroke={colors.iconPrimary} />
          </View>
        </QuickActionButton>
      ) : null}
    </View>
  );
}
