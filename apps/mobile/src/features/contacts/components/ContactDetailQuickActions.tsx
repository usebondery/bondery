import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { IconMail, IconMessage, IconPhone } from "@tabler/icons-react-native";
import { View } from "react-native";
import { useCommonTranslations, useContactInfoTranslations } from "@/lib/i18n/generated/hooks";
import { ScalePressable } from "../../../theme/ScalePressable";
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
    <View style={[styles.quickActions, { borderBottomColor: colors.border }]}>
      {phones.length > 0 ? (
        <ScalePressable
          accessibilityLabel={t("actions.call")}
          onPress={() => {
            if (primaryPhone) {
              onOpenPhone(primaryPhone);
            }
          }}
          style={styles.actionButton}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfacePressed }]}>
            <IconPhone size={20} stroke={colors.iconPrimary} />
          </View>
        </ScalePressable>
      ) : null}
      {phones.length > 0 ? (
        <ScalePressable
          accessibilityLabel={t("actions.message")}
          onPress={() => {
            if (primaryPhone) {
              onOpenSms(primaryPhone);
            }
          }}
          style={styles.actionButton}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfacePressed }]}>
            <IconMessage size={20} stroke={colors.iconPrimary} />
          </View>
        </ScalePressable>
      ) : null}
      {emails.length > 0 ? (
        <ScalePressable
          accessibilityLabel={tContactInfo("SendEmailAction")}
          onPress={() => {
            if (primaryEmail) {
              onOpenEmail(primaryEmail);
            }
          }}
          style={styles.actionButton}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.surfacePressed }]}>
            <IconMail size={20} stroke={colors.iconPrimary} />
          </View>
        </ScalePressable>
      ) : null}
    </View>
  );
}
