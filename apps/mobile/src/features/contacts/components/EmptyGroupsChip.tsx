import { View } from "react-native";
import { useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { Text } from "../../../components/ui/Text";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

/** Static placeholder chip matching {@link CreateGroupChip} styling — not tappable. */
export function EmptyGroupsChip() {
  const tMobileContacts = useMobileContactsTranslations();
  const colors = useMobileThemeColors();
  const label = tMobileContacts("NoGroupsYet");

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      className="flex-row items-center gap-1.5 rounded-full border border-dashed px-3 py-2"
      style={{
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderStrong,
      }}
    >
      <Text fw={600} size="md">
        {label}
      </Text>
    </View>
  );
}
