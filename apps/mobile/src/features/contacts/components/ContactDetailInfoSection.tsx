import type { Contact } from "@bondery/schemas";
import { IconClock } from "@tabler/icons-react-native";
import { Text, View } from "react-native";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatAbsoluteDate, formatRelativeDate } from "../contactUtils";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactDetailInfoSectionProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  contact: Contact;
}

export function ContactDetailInfoSection({ colors, contact }: ContactDetailInfoSectionProps) {
  if (!contact.lastInteraction) {
    return null;
  }

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader title="Info" />
      <View
        style={[
          contactDetailStyles.card,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={contactDetailStyles.infoRow}>
          <IconClock size={16} stroke={colors.iconSecondary} />
          <View style={contactDetailStyles.infoTexts}>
            <Text style={[contactDetailStyles.sectionLabel, { color: colors.textMuted }]}>
              Last interaction
            </Text>
            <Text style={[contactDetailStyles.infoValue, { color: colors.textPrimary }]}>
              {formatRelativeDate(contact.lastInteraction)} ·{" "}
              {formatAbsoluteDate(contact.lastInteraction)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
