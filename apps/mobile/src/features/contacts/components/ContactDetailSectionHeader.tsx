import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import {
  useCommonTranslations,
  useContactAddressTranslations,
  useContactImportantDatesTranslations,
  useContactInfoTranslations,
  useMobileContactsTranslations,
  useTagsInputTranslations,
} from "@/lib/i18n/generated/hooks";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactDetailSectionHeaderAction {
  accessibilityLabel: string;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}

type SectionTitleNamespace =
  | "common"
  | "ContactAddress"
  | "ContactImportantDates"
  | "ContactInfo"
  | "MobileContacts"
  | "TagsInput";

interface ContactDetailSectionHeaderProps {
  action?: ContactDetailSectionHeaderAction;
  title?: string;
  titleKey?: string;
  titleNamespace?: SectionTitleNamespace;
}

export function ContactDetailSectionHeader({
  title,
  titleKey,
  titleNamespace = "common",
  action,
}: ContactDetailSectionHeaderProps) {
  const colors = useMobileThemeColors();
  const tCommon = useCommonTranslations();
  const tContactAddress = useContactAddressTranslations();
  const tContactImportantDates = useContactImportantDatesTranslations();
  const tContactInfo = useContactInfoTranslations();
  const tMobileContacts = useMobileContactsTranslations();
  const tTagsInput = useTagsInputTranslations();

  const tByNamespace = {
    ContactAddress: tContactAddress,
    ContactImportantDates: tContactImportantDates,
    ContactInfo: tContactInfo,
    common: tCommon,
    MobileContacts: tMobileContacts,
    TagsInput: tTagsInput,
  } as const;

  const t = tByNamespace[titleNamespace];
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
