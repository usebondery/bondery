import type { ReactNode } from "react";
import { Fragment } from "react";
import { View } from "react-native";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import { NavLink } from "./ui/NavLink";
import { Paper } from "./ui/Paper";
import { Sheet } from "./ui/Sheet";
import { ThemeIcon } from "./ui/ThemeIcon";

export type ActionListSheetRow = {
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  label: string;
  onPress: () => void;
  tone?: "danger" | "default";
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
    <Sheet onClose={() => onOpenChange(false)} opened={open} snapPoint="selectSimple" title={title}>
      <Paper withBorder>
        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          const showDangerSeparator =
            row.tone === "danger" && index > 0 && rows[index - 1]?.tone !== "danger";

          return (
            <Fragment key={row.id}>
              {showDangerSeparator ? (
                <View className="h-px w-full" style={{ backgroundColor: colors.border }} />
              ) : null}
              <NavLink
                color={row.tone === "danger" ? "danger" : "primary"}
                disabled={row.disabled}
                label={row.label}
                leftSection={<ThemeIcon>{row.icon}</ThemeIcon>}
                onPress={() => handleRowPress(row)}
                withChevron={false}
                withDivider={!isLast && rows[index + 1]?.tone !== "danger"}
              />
            </Fragment>
          );
        })}
      </Paper>
    </Sheet>
  );
}
