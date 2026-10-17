import { IconArrowLeft } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useCommonTranslations } from "../../lib/i18n/generated/hooks";
import { MOBILE_LAYOUT } from "../../theme/layout";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ActionIcon } from "../ui/ActionIcon";
import { Text } from "../ui/Text";

type StackNavBarVariant = "elevated" | "flat";

interface StackNavBarProps {
  /** Rendered below the title row with the same spacing as tab-root screen headers. */
  accessory?: ReactNode;
  onBack: () => void;
  right?: ReactNode;
  title?: string;
  /** Custom title row content sized to the fixed title slot (e.g. large title or selection toolbar). */
  titleRow?: ReactNode;
  variant?: StackNavBarVariant;
}

/**
 * Stack push screen nav bar with back action, fixed-height title row, and optional accessory.
 * Uses tab-root top padding and title row height for parity with tab screens.
 */
export function StackNavBar({
  title,
  titleRow,
  onBack,
  right,
  accessory,
  variant = "flat",
}: StackNavBarProps) {
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const isElevated = variant === "elevated";
  const backgroundColor = isElevated ? colors.surfaceElevated : colors.appBackground;
  const titleContent =
    titleRow ??
    (title ? (
      <Text className="text-center text-[17px] font-bold" numberOfLines={1} size={null}>
        {title}
      </Text>
    ) : null);

  return (
    <View
      className="pb-2"
      style={{
        backgroundColor,
        borderBottomColor: colors.border,
        borderBottomWidth: isElevated ? 1 : 0,
        paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
        paddingTop: MOBILE_LAYOUT.screenChrome.tabRootTopPadding,
      }}
    >
      <View className="flex-row items-center">
        <ActionIcon accessibilityLabel={t("a11y.back")} onPress={onBack} size="sm">
          <IconArrowLeft size={22} stroke={colors.iconPrimary} />
        </ActionIcon>
        <View
          className="mx-1 flex-1 justify-center overflow-hidden"
          style={{ height: MOBILE_LAYOUT.screenChrome.titleRowHeight }}
        >
          {titleContent}
        </View>
        {right ?? (
          <View style={{ height: MOBILE_LAYOUT.iconButton, width: MOBILE_LAYOUT.iconButton }} />
        )}
      </View>
      {accessory ? (
        <View style={{ marginTop: MOBILE_LAYOUT.screenChrome.accessoryTopMargin }}>
          {accessory}
        </View>
      ) : null}
    </View>
  );
}
