import { getContactAddressTypeEmoji, getContactChannelTypeEmoji } from "@bondery/helpers";
import type { ContactAddressType, ContactType } from "@bondery/schemas";
import { IconStarFilled } from "@tabler/icons-react-native";
import { Text, View } from "react-native";
import {
  useCommonTranslations,
  useContactAddressTranslations,
  useContactInfoTranslations,
} from "@/lib/i18n/generated/hooks";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactChannelBadgesProps {
  isPreferred?: boolean;
  type: ContactType | ContactAddressType;
  typeNamespace?: "ContactInfo" | "ContactAddress";
}

export function ContactChannelBadges({
  type,
  typeNamespace = "ContactInfo",
  isPreferred = false,
}: ContactChannelBadgesProps) {
  const tContactAddress = useContactAddressTranslations();
  const tContactInfo = useContactInfoTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();

  const typeLabel =
    type === "work"
      ? t(`${typeNamespace}.TypeWork`)
      : type === "other"
        ? tContactAddress("TypeOther")
        : t(`${typeNamespace}.TypeHome`);

  const typeEmoji =
    typeNamespace === "ContactAddress"
      ? getContactAddressTypeEmoji(type as ContactAddressType)
      : getContactChannelTypeEmoji(type as ContactType);

  return (
    <View style={contactDetailStyles.badgeRow}>
      {isPreferred ? (
        <View
          style={[
            contactDetailStyles.badge,
            contactDetailStyles.preferredBadge,
            { backgroundColor: colors.selectionBackground },
          ]}
        >
          <IconStarFilled fill={colors.primary} size={12} stroke={colors.primary} />
          <Text style={[contactDetailStyles.badgeText, { color: colors.primary }]}>
            {tContactInfo("Preferred")}
          </Text>
        </View>
      ) : null}
      <View style={[contactDetailStyles.badge, { backgroundColor: colors.border }]}>
        <Text style={contactDetailStyles.typeEmoji}>{typeEmoji}</Text>
        <Text style={[contactDetailStyles.badgeText, { color: colors.textSecondary }]}>
          {typeLabel}
        </Text>
      </View>
    </View>
  );
}
