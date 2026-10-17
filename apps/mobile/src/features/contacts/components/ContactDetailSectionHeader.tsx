import type { ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import {
  useCommonTranslations,
  useContactAddressTranslations,
  useContactImportantDatesTranslations,
  useContactInfoTranslations,
  useMobileContactsTranslations,
  useTagsInputTranslations,
} from "@/lib/i18n/generated/hooks";
import { Text } from "../../../components/ui/Text";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
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
  const tCommon = useCommonTranslations();
  const tContactAddress = useContactAddressTranslations();
  const tContactImportantDates = useContactImportantDatesTranslations();
  const tContactInfo = useContactInfoTranslations();
  const tMobileContacts = useMobileContactsTranslations();
  const tTagsInput = useTagsInputTranslations();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");

  const tByNamespace = {
    ContactAddress: tContactAddress,
    ContactImportantDates: tContactImportantDates,
    ContactInfo: tContactInfo,
    common: tCommon,
    MobileContacts: tMobileContacts,
    TagsInput: tTagsInput,
  } as const;

  const resolvedTitle =
    title ?? (titleKey ? (tByNamespace[titleNamespace] as (key: string) => string)(titleKey) : "");

  return (
    <View style={contactDetailStyles.sectionHeaderRow}>
      <Text
        accessibilityRole="header"
        c="muted"
        className="flex-1 tracking-wide uppercase"
        fw={700}
        size="xs"
      >
        {resolvedTitle}
      </Text>

      {action ? (
        <Animated.View style={squeezeStyle}>
          <Pressable
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            onPress={action.onPress}
            onPressIn={pressIn}
            onPressOut={pressOut}
            style={contactDetailStyles.sectionHeaderAction}
          >
            {action.icon}
            <Text c="brand" fw={600} size="md">
              {action.label}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
