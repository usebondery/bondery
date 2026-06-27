import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactDetailSectionHeaderAction {
  label: string;
  accessibilityLabel: string;
  icon: ReactNode;
  onPress: () => void;
}

interface ContactDetailSectionHeaderProps {
  title?: string;
  titleKey?: string;
  action?: ContactDetailSectionHeaderAction;
}

export function ContactDetailSectionHeader({ title, titleKey, action }: ContactDetailSectionHeaderProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();
  const resolvedTitle = title ?? (titleKey ? t(titleKey) : "");

  return (
    <View style={contactDetailStyles.sectionHeaderRow}>
      <Text
        accessibilityRole="header"
        style={[contactDetailStyles.sectionTitle, MOBILE_TEXT_STYLES.sectionLabel, { color: colors.textMuted }]}
      >
        {resolvedTitle.toUpperCase()}
      </Text>

      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
          style={contactDetailStyles.sectionHeaderAction}
        >
          {action.icon}
          <Text style={[contactDetailStyles.sectionHeaderActionText, { color: colors.primary }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
