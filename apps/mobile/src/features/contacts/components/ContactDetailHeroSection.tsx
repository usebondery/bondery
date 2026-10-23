import type { Contact } from "@bondery/schemas";
import { IconPencil } from "@tabler/icons-react-native";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import {
  useContactInfoTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import { PersonAvatar } from "../../../components/PersonAvatar";
import { Heading } from "../../../components/ui/Heading";
import { Text } from "../../../components/ui/Text";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import type { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatContactLocation, formatContactName } from "../contactUtils";
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
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const name = formatContactName(contact);
  const locationLabel = formatContactLocation(contact);

  return (
    <View style={styles.heroSection}>
      <View style={contactDetailStyles.sectionHeaderRow}>
        <View style={styles.heroHeaderSpacer} />
        <Animated.View style={squeezeStyle}>
          <Pressable
            accessibilityLabel={tMobileContactIdentity("EditProfile")}
            accessibilityRole="button"
            onPress={onEditPress}
            onPressIn={pressIn}
            onPressOut={pressOut}
            style={contactDetailStyles.sectionHeaderAction}
          >
            <IconPencil size={16} stroke={colors.primary} />
            <Text c="brand" fw={600} size="md">
              {tContactInfo("EditAction")}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroAvatarWrap}>
          <PersonAvatar person={contact} size={MOBILE_LAYOUT.avatar.hero} uri={contact.avatar} />
        </View>
        <Heading className="text-center text-[24px]" order={2} ta="center">
          {name}
        </Heading>
        {contact.headline ? (
          <Text c="secondary" className="text-center" size="md" ta="center">
            {contact.headline}
          </Text>
        ) : null}
        {locationLabel ? (
          <Text c="muted" className="text-center" size="xs" ta="center">
            {locationLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
