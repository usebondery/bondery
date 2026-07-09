import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactDetailSectionHeaderAction {
  accessibilityLabel: string;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}

interface ContactDetailSectionHeaderProps {
  action?: ContactDetailSectionHeaderAction;
  title?: string;
  titleKey?: string;
  titleNamespace?: string;
}

export function ContactDetailSectionHeader({
  title,
  titleKey,
  titleNamespace,
  action,
}: ContactDetailSectionHeaderProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations(titleNamespace ?? "common");
  const resolvedTitle = title ?? (titleKey ? t(titleKey) : "");

  return (
    <View style={contactDetailStyles.sectionHeaderRow}>
      <Text
        accessibilityRole="header"
        style={[
          contactDetailStyles.sectionTitle,
          MOBILE_TEXT_STYLES.sectionLabel,
          { color: colors.textMuted },
        ]}
      >
        {resolvedTitle.toUpperCase()}
      </Text>

      {action ? (
        <Pressable
          accessibilityLabel={action.accessibilityLabel}
          accessibilityRole="button"
          onPress={action.onPress}
          style={contactDetailStyles.sectionHeaderAction}
        >
          {action.icon}
          <Text style={[contactDetailStyles.sectionHeaderActionText, { color: colors.primary }]}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
