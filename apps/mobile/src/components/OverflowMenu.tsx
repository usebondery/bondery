import { IconDotsVertical } from "@tabler/icons-react-native";
import { Popover } from "@tamagui/popover";
import { Fragment, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { UI_TIMING_MS } from "../lib/config";
import { POPOVER_MOTION, TAMAGUI_TRANSITION } from "../theme/animations";
import { SqueezePressable } from "../theme/SqueezePressable";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import {
  OVERFLOW_MENU_RADIUS,
  OverflowMenuItem,
  type OverflowMenuItemConfig,
} from "./OverflowMenuItem";

type OverflowMenuTriggerVariant = "nav" | "row";

interface OverflowMenuProps {
  accessibilityLabel: string;
  disabled?: boolean;
  items: OverflowMenuItemConfig[];
  triggerVariant?: OverflowMenuTriggerVariant;
}

export function OverflowMenu({
  items,
  accessibilityLabel,
  disabled = false,
  triggerVariant = "nav",
}: OverflowMenuProps) {
  const colors = useMobileThemeColors();
  const [open, setOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const openedAtRef = useRef(0);
  const isRowTrigger = triggerVariant === "row";

  function remountPopover() {
    setInstanceKey((current) => current + 1);
  }

  function handleOpenChange(nextOpen: boolean) {
    const now = Date.now();
    // Popover backdrop can mount before the opening touch ends and immediately dismiss.
    if (!nextOpen && now - openedAtRef.current < UI_TIMING_MS.popoverTransitionMs) {
      return;
    }

    if (nextOpen) {
      openedAtRef.current = now;
      setOpen(true);
      return;
    }

    setOpen(false);
    remountPopover();
  }

  function closeAndRun(action: () => void) {
    setOpen(false);
    remountPopover();
    action();
  }

  return (
    <Popover
      allowFlip
      key={instanceKey}
      onOpenChange={handleOpenChange}
      open={open}
      placement="bottom-end"
      stayInFrame
    >
      <Popover.Trigger asChild disabled={disabled}>
        <SqueezePressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          animateOnly={["scale", "backgroundColor"]}
          backgroundColor={open ? colors.surfacePressed : "transparent"}
          disabled={disabled}
          hitSlop={isRowTrigger ? MOBILE_HIT_SLOP.icon : MOBILE_HIT_SLOP.nav}
          overflow="hidden"
          style={styles.menuButton}
          transition={TAMAGUI_TRANSITION.quick}
          variant="subtle"
        >
          <IconDotsVertical
            size={isRowTrigger ? 20 : 22}
            stroke={isRowTrigger ? colors.iconSecondary : colors.iconPrimary}
          />
        </SqueezePressable>
      </Popover.Trigger>

      <Popover.Content
        {...POPOVER_MOTION}
        backgroundColor={colors.surfaceElevated}
        borderColor={colors.border}
        bordered
        borderRadius={OVERFLOW_MENU_RADIUS}
        borderWidth={1}
        elevate
        minWidth={MOBILE_LAYOUT.menuMinWidth}
        overflow="hidden"
        padding={0}
      >
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const showSeparatorBefore =
            item.tone === "danger" && index > 0 && items[index - 1]?.tone !== "danger";

          return (
            <Fragment key={item.id}>
              {showSeparatorBefore ? (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              ) : null}
              <OverflowMenuItem
                {...item}
                isFirst={isFirst && !showSeparatorBefore}
                isLast={isLast}
                onPress={() => closeAndRun(item.onPress)}
              />
            </Fragment>
          );
        })}
      </Popover.Content>
    </Popover>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    height: MOBILE_LAYOUT.iconButton,
    justifyContent: "center",
    width: MOBILE_LAYOUT.iconButton,
  },
  separator: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
  },
});
