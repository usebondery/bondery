import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { ContactAddressType, ContactType } from "@bondery/schemas";
import { OverflowMenu } from "../../../components/OverflowMenu";
import type { OverflowMenuItemConfig } from "../../../components/OverflowMenuItem";
import { useSingleDoubleTap } from "../../../lib/gestures/useSingleDoubleTap";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { ContactChannelBadges } from "./ContactChannelBadges";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactChannelRowProps {
  primaryLabel: string;
  labelContent?: ReactNode;
  type: ContactType | ContactAddressType;
  typeNamespace?: "ContactInfo" | "ContactAddress";
  isPreferred: boolean;
  channelIcon: ReactNode;
  menuItems: OverflowMenuItemConfig[];
  menuAccessibilityLabel: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
  onDoublePress?: () => void;
  onLongPress: () => void;
}

export function ContactChannelRow({
  primaryLabel,
  labelContent,
  type,
  typeNamespace = "ContactInfo",
  isPreferred,
  channelIcon,
  menuItems,
  menuAccessibilityLabel,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onDoublePress,
  onLongPress,
}: ContactChannelRowProps) {
  const colors = useMobileThemeColors();
  const handlePress = useSingleDoubleTap({
    onSinglePress: onPress,
    onDoublePress,
    enabled: Boolean(onDoublePress),
  });

  return (
    <View
      style={[
        contactDetailStyles.card,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <View style={contactDetailStyles.cardRow}>
        <View style={contactDetailStyles.cardLeadingIcon}>{channelIcon}</View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          onPress={handlePress}
          onLongPress={onLongPress}
          style={contactDetailStyles.cardPressable}
        >
          <View style={contactDetailStyles.cardLeft}>
            {labelContent ?? (
              <Text style={[contactDetailStyles.cardPrimary, { color: colors.textPrimary }]}>
                {primaryLabel}
              </Text>
            )}
            <ContactChannelBadges type={type} typeNamespace={typeNamespace} isPreferred={isPreferred} />
          </View>
        </Pressable>

        <OverflowMenu
          items={menuItems}
          accessibilityLabel={menuAccessibilityLabel}
          triggerVariant="row"
        />
      </View>
    </View>
  );
}
