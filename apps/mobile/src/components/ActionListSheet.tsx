import type { ReactNode } from "react";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Sheet } from "@tamagui/sheet";
import { SettingsNavigationRow } from "../features/settings/components/SettingsNavigationRow";
import { SettingsSectionCard } from "../features/settings/components/SettingsSectionCard";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

export type ActionListSheetRow = {
  id: string;
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

interface ActionListSheetProps {
  open: boolean;
  title: string;
  rows: ActionListSheetRow[];
  onOpenChange: (open: boolean) => void;
}

/**
 * Bottom sheet with a settings-style action list (icon + label rows).
 */
export function ActionListSheet({ open, title, rows, onOpenChange }: ActionListSheetProps) {
  const colors = useMobileThemeColors();

  const handleRowPress = (row: ActionListSheetRow) => {
    if (row.disabled) {
      return;
    }

    onOpenChange(false);
    row.onPress();
  };

  return (
    <Sheet
      native
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPointsMode="fit"
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay backgroundColor={colors.overlay} />
      <Sheet.Frame
        backgroundColor={colors.surface}
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        paddingTop={10}
        paddingBottom={16}
        paddingHorizontal={MOBILE_LAYOUT.spacing.horizontal}
        flex={0}
      >
        <Sheet.Handle backgroundColor={colors.borderStrong} marginBottom={12} alignSelf="center" />

        <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
          {title}
        </Text>

        <SettingsSectionCard>
          {rows.map((row, index) => {
            const isLast = index === rows.length - 1;
            const showDangerSeparator =
              row.tone === "danger" && index > 0 && rows[index - 1]?.tone !== "danger";

            return (
              <Fragment key={row.id}>
                {showDangerSeparator ? (
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                ) : null}
                <SettingsNavigationRow
                  icon={row.icon}
                  label={row.label}
                  showTrailing={false}
                  showDivider={!isLast && rows[index + 1]?.tone !== "danger"}
                  labelColor={row.tone === "danger" ? colors.dangerAccent : undefined}
                  disabled={row.disabled}
                  onPress={() => handleRowPress(row)}
                />
              </Fragment>
            );
          })}
        </SettingsSectionCard>
      </Sheet.Frame>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    marginBottom: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
});
