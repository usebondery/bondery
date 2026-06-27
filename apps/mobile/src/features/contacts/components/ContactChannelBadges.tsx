import { Text, View } from "react-native";
import { IconStarFilled } from "@tabler/icons-react-native";
import type { ContactAddressType, ContactType } from "@bondery/schemas";
import { getContactAddressTypeEmoji, getContactChannelTypeEmoji } from "@bondery/helpers";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactChannelBadgesProps {
  type: ContactType | ContactAddressType;
  typeNamespace?: "ContactInfo" | "ContactAddress";
  isPreferred?: boolean;
}

export function ContactChannelBadges({
  type,
  typeNamespace = "ContactInfo",
  isPreferred = false,
}: ContactChannelBadgesProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();

  const typeLabel =
    type === "work"
      ? t(`${typeNamespace}.TypeWork`)
      : type === "other"
        ? t("ContactAddress.TypeOther")
        : t(`${typeNamespace}.TypeHome`);

  const typeEmoji =
    typeNamespace === "ContactAddress"
      ? getContactAddressTypeEmoji(type as ContactAddressType)
      : getContactChannelTypeEmoji(type as ContactType);

  return (
    <View style={contactDetailStyles.badgeRow}>
      {isPreferred ? (
        <View style={[contactDetailStyles.badge, contactDetailStyles.preferredBadge, { backgroundColor: colors.selectionBackground }]}>
          <IconStarFilled size={12} fill={colors.primary} stroke={colors.primary} />
          <Text style={[contactDetailStyles.badgeText, { color: colors.primary }]}>{t("ContactInfo.Preferred")}</Text>
        </View>
      ) : null}
      <View style={[contactDetailStyles.badge, { backgroundColor: colors.border }]}>
        <Text style={contactDetailStyles.typeEmoji}>{typeEmoji}</Text>
        <Text style={[contactDetailStyles.badgeText, { color: colors.textSecondary }]}>{typeLabel}</Text>
      </View>
    </View>
  );
}
