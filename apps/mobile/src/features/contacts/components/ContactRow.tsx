import type { Contact } from "@bondery/schemas";
import { IconCheck } from "@tabler/icons-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Swipeable, {
  type SwipeableMethods,
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { PersonAvatar } from "../../../components/PersonAvatar";
import { Group } from "../../../components/ui/Group";
import { Text } from "../../../components/ui/Text";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import { UI_TIMING_MS } from "../../../lib/config";
import { getSwipeActionIcon, getSwipeActionLabel } from "../../../lib/preferences/swipeActionIcons";
import type { SwipeAction } from "../../../lib/preferences/useMobilePreferences";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatContactName } from "../contactUtils";

interface ContactRowProps {
  contact: Contact;
  isDisabled?: boolean;
  isSwipeEnabled?: boolean;
  leftSwipeAction: SwipeAction;
  onEnterSelection: (contactId: string) => void;
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
  onPress?: (contactId: string) => void;
  onToggleSelect: (contactId: string) => void;
  previewMode?: boolean;
  rightSwipeAction: SwipeAction;
  selected: boolean;
  selectionMode: boolean;
  texts: {
    call: string;
    message: string;
    email: string;
  };
}

const SWIPE_ACTION_ICON_SIZE = 22;
const DISABLED_ROW_OPACITY = 0.45;
const CONTACT_ROW_HEIGHT = 56;

export function ContactRow({
  contact,
  selected,
  selectionMode,
  isDisabled = false,
  isSwipeEnabled = true,
  previewMode = false,
  leftSwipeAction,
  rightSwipeAction,
  texts,
  onToggleSelect,
  onEnterSelection,
  onExecuteAction,
  onPress,
}: ContactRowProps) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("default");
  const swipeableRef = useRef<SwipeableMethods>(null);
  const name = formatContactName(contact);
  const swipeGesturesEnabled = isSwipeEnabled && !selectionMode;
  const showDisabledStyle = isDisabled && selectionMode;
  const isRowSelected = selected && !showDisabledStyle;

  useEffect(() => {
    if (selectionMode) {
      swipeableRef.current?.close();
    }
  }, [selectionMode]);

  function handleLongPress() {
    if (previewMode || selectionMode || isDisabled) {
      return;
    }

    onEnterSelection(contact.id);
  }

  function handlePress() {
    if (previewMode) {
      return;
    }

    if (selectionMode) {
      if (isDisabled) {
        return;
      }

      onToggleSelect(contact.id);
      return;
    }

    onPress?.(contact.id);
  }

  function renderLeftActions() {
    return (
      <View
        accessibilityLabel={getSwipeActionLabel(rightSwipeAction, texts)}
        style={[styles.action, { backgroundColor: colors.successSurface }]}
      >
        {getSwipeActionIcon(rightSwipeAction, colors.textPrimary, SWIPE_ACTION_ICON_SIZE)}
      </View>
    );
  }

  function renderRightActions() {
    return (
      <View
        accessibilityLabel={getSwipeActionLabel(leftSwipeAction, texts)}
        style={[styles.action, { backgroundColor: colors.warningSurface }]}
      >
        {getSwipeActionIcon(leftSwipeAction, colors.textPrimary, SWIPE_ACTION_ICON_SIZE)}
      </View>
    );
  }

  function handleSwipeableOpen(direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) {
    swipeableRef.current?.close();

    if (previewMode) {
      return;
    }

    if (direction === SwipeDirection.LEFT) {
      onExecuteAction(contact, leftSwipeAction);
      return;
    }

    onExecuteAction(contact, rightSwipeAction);
  }

  const rowContent = (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityState={{ disabled: showDisabledStyle }}
        className="w-full flex-row items-center justify-between px-4"
        delayLongPress={selectionMode ? undefined : UI_TIMING_MS.longPressDelay}
        onLongPress={selectionMode ? undefined : handleLongPress}
        onPress={handlePress}
        onPressIn={() => {
          if (showDisabledStyle) {
            return;
          }
          pressIn();
        }}
        onPressOut={pressOut}
        style={{
          backgroundColor: isRowSelected ? colors.selectionBackground : colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: previewMode ? 0 : 1,
          minHeight: CONTACT_ROW_HEIGHT,
          opacity: showDisabledStyle ? DISABLED_ROW_OPACITY : 1,
        }}
      >
        <Group className="min-w-0 flex-1 pr-3" gap="sm">
          {isRowSelected ? (
            <View
              className="items-center justify-center"
              style={[styles.avatar, { backgroundColor: colors.selectionBackgroundStrong }]}
            >
              <IconCheck size={16} stroke={colors.textPrimary} />
            </View>
          ) : (
            <PersonAvatar person={contact} size={MOBILE_LAYOUT.avatar.list} uri={contact.avatar} />
          )}
          <Text className="shrink" fw={500} numberOfLines={1} size="xl">
            {name}
          </Text>
        </Group>
      </Pressable>
    </Animated.View>
  );

  if (!isSwipeEnabled) {
    return rowContent;
  }

  return (
    <View collapsable={false}>
      <Swipeable
        enabled={swipeGesturesEnabled}
        friction={2}
        onSwipeableOpen={handleSwipeableOpen}
        overshootLeft={false}
        overshootRight={false}
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
      >
        {rowContent}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
  },
  avatar: {
    borderRadius: MOBILE_LAYOUT.avatar.list / 2,
    height: MOBILE_LAYOUT.avatar.list,
    width: MOBILE_LAYOUT.avatar.list,
  },
});
