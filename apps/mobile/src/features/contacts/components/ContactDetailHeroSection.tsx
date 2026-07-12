import type { Contact } from "@bondery/schemas";
import { IconPencil } from "@tabler/icons-react-native";
import { Image, Pressable, Text, View } from "react-native";
import {
  useCommonTranslations,
  useContactInfoTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import { normalizeMobileUrlForDevice } from "../../../lib/config";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  formatContactLocation,
  formatContactName,
  getAvatarColorHex,
  getContactInitials,
} from "../contactUtils";
import { contactDetailScreenStyles as styles } from "./contactDetailScreenStyles";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactDetailHeroSectionProps {
  colors: ReturnType<typeof useMobileThemeColors>;
  contact: Contact;
  onEditPress: () => void;
}

export function ContactDetailHeroSection({
  colors,
  contact,
  onEditPress,
}: ContactDetailHeroSectionProps) {
  const tContactInfo = useContactInfoTranslations();
  const tMobileContactIdentity = useMobileContactIdentityTranslations();
  const _t = useCommonTranslations();
  const initials = getContactInitials(contact);
  const avatarColor = getAvatarColorHex(contact);
  const avatarUri = contact.avatar ? normalizeMobileUrlForDevice(contact.avatar) : null;
  const shouldShowAvatarImage = Boolean(avatarUri);
  const name = formatContactName(contact);
  const locationLabel = formatContactLocation(contact);

  return (
    <View style={styles.heroSection}>
      <View style={contactDetailStyles.sectionHeaderRow}>
        <View style={styles.heroHeaderSpacer} />
        <Pressable
          accessibilityLabel={tMobileContactIdentity("EditProfile")}
          accessibilityRole="button"
          onPress={onEditPress}
          style={contactDetailStyles.sectionHeaderAction}
        >
          <IconPencil size={16} stroke={colors.primary} />
          <Text style={[contactDetailStyles.sectionHeaderActionText, { color: colors.primary }]}>
            {tContactInfo("EditAction")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: colors.surfacePressed },
            !shouldShowAvatarImage && { backgroundColor: avatarColor },
          ]}
        >
          {shouldShowAvatarImage ? (
            <Image
              resizeMode="cover"
              source={{ uri: avatarUri || undefined }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={[styles.avatarInitial, { color: colors.textOnPrimary }]}>{initials}</Text>
          )}
        </View>
        <Text style={[styles.heroName, { color: colors.textPrimary }]}>{name}</Text>
        {contact.headline ? (
          <Text style={[styles.heroHeadline, { color: colors.textSecondary }]}>
            {contact.headline}
          </Text>
        ) : null}
        {locationLabel ? (
          <Text style={[styles.heroPlace, { color: colors.textMuted }]}>{locationLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}
