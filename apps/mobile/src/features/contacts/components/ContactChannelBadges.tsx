import { getContactAddressTypeEmoji, getContactChannelTypeEmoji } from "@bondery/helpers";
import type { ContactAddressType, ContactType } from "@bondery/schemas";
import { IconStarFilled } from "@tabler/icons-react-native";
import { View } from "react-native";
import {
  useContactAddressTranslations,
  useContactInfoTranslations,
} from "@/lib/i18n/generated/hooks";
import { Text } from "../../../components/ui/Text";
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
  const colors = useMobileThemeColors();

  const typeLabel =
    type === "work"
      ? typeNamespace === "ContactAddress"
        ? tContactAddress("TypeWork")
        : tContactInfo("TypeWork")
      : type === "other"
        ? tContactAddress("TypeOther")
        : typeNamespace === "ContactAddress"
          ? tContactAddress("TypeHome")
          : tContactInfo("TypeHome");

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
          <Text c="brand" className="text-[11px]" fw={600} size={null}>
            {tContactInfo("Preferred")}
          </Text>
        </View>
      ) : null}
      <View style={[contactDetailStyles.badge, { backgroundColor: colors.border }]}>
        <Text style={contactDetailStyles.typeEmoji}>{typeEmoji}</Text>
        <Text c="secondary" className="text-[11px]" fw={600} size={null}>
          {typeLabel}
        </Text>
      </View>
    </View>
  );
}
