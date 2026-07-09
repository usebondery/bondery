import { Sheet } from "@tamagui/sheet";
import type { ReactNode } from "react";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
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
  onOpenChange: (open: boolean) => void;
  open: boolean;
  rows: ActionListSheetRow[];
  title: string;
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
      dismissOnOverlayPress
      dismissOnSnapToBottom
      modal
      native
      onOpenChange={onOpenChange}
      open={open}
      snapPointsMode="fit"
    >
      <Sheet.Overlay backgroundColor={colors.overlay} />
      <Sheet.Frame
        backgroundColor={colors.surface}
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        flex={0}
        paddingBottom={16}
        paddingHorizontal={MOBILE_LAYOUT.spacing.horizontal}
        paddingTop={10}
      >
        <Sheet.Handle alignSelf="center" backgroundColor={colors.borderStrong} marginBottom={12} />

        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
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
                  disabled={row.disabled}
                  icon={row.icon}
                  label={row.label}
                  labelColor={row.tone === "danger" ? colors.dangerAccent : undefined}
                  onPress={() => handleRowPress(row)}
                  showDivider={!isLast && rows[index + 1]?.tone !== "danger"}
                  showTrailing={false}
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
  separator: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    marginBottom: 12,
  },
});
