import { Fragment, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconDotsVertical } from "@tabler/icons-react-native";
import { Popover } from "@tamagui/popover";
import { UI_TIMING_MS } from "../lib/config";
import { POPOVER_MOTION, TAMAGUI_TRANSITION } from "../theme/animations";
import { SqueezePressable } from "../theme/SqueezePressable";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import { OVERFLOW_MENU_RADIUS, OverflowMenuItem, type OverflowMenuItemConfig } from "./OverflowMenuItem";

type OverflowMenuTriggerVariant = "nav" | "row";

interface OverflowMenuProps {
  items: OverflowMenuItemConfig[];
  accessibilityLabel: string;
  disabled?: boolean;
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
      key={instanceKey}
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottom-end"
      allowFlip
      stayInFrame
    >
      <Popover.Trigger asChild disabled={disabled}>
        <SqueezePressable
          variant="subtle"
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: open }}
          hitSlop={isRowTrigger ? MOBILE_HIT_SLOP.icon : MOBILE_HIT_SLOP.nav}
          disabled={disabled}
          overflow="hidden"
          style={styles.menuButton}
          backgroundColor={open ? colors.surfacePressed : "transparent"}
          transition={TAMAGUI_TRANSITION.quick}
          animateOnly={["scale", "backgroundColor"]}
        >
          <IconDotsVertical
            size={isRowTrigger ? 20 : 22}
            stroke={isRowTrigger ? colors.iconSecondary : colors.iconPrimary}
          />
        </SqueezePressable>
      </Popover.Trigger>

      <Popover.Content
        {...POPOVER_MOTION}
        elevate
        bordered
        borderWidth={1}
        borderColor={colors.border}
        backgroundColor={colors.surfaceElevated}
        borderRadius={OVERFLOW_MENU_RADIUS}
        overflow="hidden"
        padding={0}
        minWidth={MOBILE_LAYOUT.menuMinWidth}
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
    width: MOBILE_LAYOUT.iconButton,
    height: MOBILE_LAYOUT.iconButton,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
});
