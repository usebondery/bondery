import type { ContactAddressType, ContactType } from "@bondery/schemas";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { OverflowMenu } from "../../../components/OverflowMenu";
import type { OverflowMenuItemConfig } from "../../../components/OverflowMenuItem";
import { useSingleDoubleTap } from "../../../lib/gestures/useSingleDoubleTap";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { ContactChannelBadges } from "./ContactChannelBadges";
import { contactDetailStyles } from "./contactDetailStyles";

interface ContactChannelRowProps {
  accessibilityHint: string;
  accessibilityLabel: string;
  channelIcon: ReactNode;
  isPreferred: boolean;
  labelContent?: ReactNode;
  menuAccessibilityLabel: string;
  menuItems: OverflowMenuItemConfig[];
  onDoublePress?: () => void;
  onLongPress: () => void;
  onPress: () => void;
  primaryLabel: string;
  type: ContactType | ContactAddressType;
  typeNamespace?: "ContactInfo" | "ContactAddress";
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
    enabled: Boolean(onDoublePress),
    onDoublePress,
    onSinglePress: onPress,
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
          accessibilityHint={accessibilityHint}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onLongPress={onLongPress}
          onPress={handlePress}
          style={contactDetailStyles.cardPressable}
        >
          <View style={contactDetailStyles.cardLeft}>
            {labelContent ?? (
              <Text style={[contactDetailStyles.cardPrimary, { color: colors.textPrimary }]}>
                {primaryLabel}
              </Text>
            )}
            <ContactChannelBadges
              isPreferred={isPreferred}
              type={type}
              typeNamespace={typeNamespace}
            />
          </View>
        </Pressable>

        <OverflowMenu
          accessibilityLabel={menuAccessibilityLabel}
          items={menuItems}
          triggerVariant="row"
        />
      </View>
    </View>
  );
}
