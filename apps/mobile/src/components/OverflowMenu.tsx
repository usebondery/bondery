import { IconDotsVertical } from "@tabler/icons-react-native";
import { type ComponentRef, Fragment, useRef, useState } from "react";
import { Dimensions, type LayoutRectangle, Modal, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { UI_TIMING_MS } from "../lib/config";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../theme/layout";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import {
  OVERFLOW_MENU_RADIUS,
  OverflowMenuItem,
  type OverflowMenuItemConfig,
} from "./OverflowMenuItem";
import { joinClassNames } from "./ui/joinClassNames";
import { Paper } from "./ui/Paper";
import { usePressSqueeze } from "./ui/usePressSqueeze";

type OverflowMenuTriggerVariant = "nav" | "row";

interface OverflowMenuProps {
  accessibilityLabel: string;
  disabled?: boolean;
  items: OverflowMenuItemConfig[];
  triggerVariant?: OverflowMenuTriggerVariant;
}

const MENU_GAP = 4;
const SCREEN_EDGE_PADDING = 8;

function menuPosition(anchor: LayoutRectangle & { windowWidth: number }) {
  const menuWidth = MOBILE_LAYOUT.menuMinWidth;
  const left = Math.min(
    Math.max(anchor.x + anchor.width - menuWidth, SCREEN_EDGE_PADDING),
    anchor.windowWidth - menuWidth - SCREEN_EDGE_PADDING,
  );
  const top = anchor.y + anchor.height + MENU_GAP;

  return { left, top, width: menuWidth };
}

export function OverflowMenu({
  items,
  accessibilityLabel,
  disabled = false,
  triggerVariant = "nav",
}: OverflowMenuProps) {
  const colors = useMobileThemeColors();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<(LayoutRectangle & { windowWidth: number }) | null>(null);
  const [instanceKey, setInstanceKey] = useState(0);
  const openedAtRef = useRef(0);
  const triggerRef = useRef<ComponentRef<typeof View>>(null);
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const isRowTrigger = triggerVariant === "row";
  const iconSize = isRowTrigger ? 20 : 22;
  const iconColor = isRowTrigger ? colors.iconSecondary : colors.iconPrimary;

  function remountMenu() {
    setInstanceKey((current) => current + 1);
  }

  function closeMenu() {
    setOpen(false);
    setAnchor(null);
    remountMenu();
  }

  function tryCloseMenu() {
    const now = Date.now();
    if (now - openedAtRef.current < UI_TIMING_MS.popoverTransitionMs) {
      return;
    }
    closeMenu();
  }

  function openMenu() {
    if (disabled) {
      return;
    }
    openedAtRef.current = Date.now();
    const windowWidth = Dimensions.get("window").width;
    triggerRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setAnchor({ height, width, windowWidth, x, y });
      setOpen(true);
    });
  }

  function closeAndRun(action: () => void) {
    closeMenu();
    action();
  }

  const menuLayout = anchor ? menuPosition(anchor) : null;

  return (
    <>
      <View collapsable={false} ref={triggerRef}>
        <Animated.View style={squeezeStyle}>
          <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled, expanded: open }}
            className={joinClassNames(
              "items-center justify-center overflow-hidden",
              isRowTrigger ? undefined : "rounded-[10px]",
            )}
            disabled={disabled}
            hitSlop={isRowTrigger ? MOBILE_HIT_SLOP.icon : MOBILE_HIT_SLOP.nav}
            onPress={openMenu}
            onPressIn={() => {
              if (disabled) {
                return;
              }
              pressIn();
            }}
            onPressOut={pressOut}
            style={[
              styles.menuButton,
              !isRowTrigger && open ? { backgroundColor: colors.surfacePressed } : undefined,
              !isRowTrigger && !open ? { backgroundColor: "transparent" } : undefined,
            ]}
          >
            <IconDotsVertical size={iconSize} stroke={iconColor} />
          </Pressable>
        </Animated.View>
      </View>

      <Modal
        animationType="fade"
        key={instanceKey}
        onRequestClose={tryCloseMenu}
        transparent
        visible={open}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            onPress={tryCloseMenu}
            style={StyleSheet.absoluteFill}
          />
          {menuLayout ? (
            <Paper
              className="absolute shadow-md"
              radius={OVERFLOW_MENU_RADIUS}
              style={[
                menuLayout,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  elevation: 8,
                  shadowColor: "#000",
                  shadowOffset: { height: 4, width: 0 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                },
              ]}
              withBorder
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
            </Paper>
          ) : null}
        </View>
      </Modal>
    </>
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
  modalRoot: {
    flex: 1,
  },
  separator: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
  },
});
