import type { Contact } from "@bondery/schemas";
import { IconCheck } from "@tabler/icons-react-native";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Swipeable, {
  type SwipeableMethods,
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { normalizeMobileUrlForDevice, UI_TIMING_MS } from "../../../lib/config";
import { getSwipeActionIcon, getSwipeActionLabel } from "../../../lib/preferences/swipeActionIcons";
import type { SwipeAction } from "../../../lib/preferences/useMobilePreferences";
import { TAMAGUI_TRANSITION } from "../../../theme/animations";
import { Tappable } from "../../../theme/Tappable";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatContactName, getAvatarColorHex, getContactInitials } from "../contactUtils";

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

export const ContactRow = memo(function ContactRow({
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
  const swipeableRef = useRef<SwipeableMethods>(null);
  const name = useMemo(() => formatContactName(contact), [contact]);
  const avatarColor = getAvatarColorHex(contact);
  const avatarUri = contact.avatar ? normalizeMobileUrlForDevice(contact.avatar) : undefined;
  const swipeGesturesEnabled = isSwipeEnabled && !selectionMode;
  const showDisabledStyle = isDisabled && selectionMode;
  const isRowSelected = selected && !showDisabledStyle;

  useEffect(() => {
    if (selectionMode) {
      swipeableRef.current?.close();
    }
  }, [selectionMode]);

  const shouldShowAvatarImage = !!avatarUri && !isRowSelected;

  const handleLongPress = useCallback(() => {
    if (previewMode || selectionMode || isDisabled) {
      return;
    }

    onEnterSelection(contact.id);
  }, [contact.id, isDisabled, onEnterSelection, previewMode, selectionMode]);

  const handlePress = useCallback(() => {
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
  }, [contact.id, isDisabled, onPress, onToggleSelect, previewMode, selectionMode]);

  const renderLeftActions = useCallback(
    () => (
      <View
        accessibilityLabel={getSwipeActionLabel(rightSwipeAction, texts)}
        style={[styles.action, styles.leftAction, { backgroundColor: colors.successSurface }]}
      >
        {getSwipeActionIcon(rightSwipeAction, colors.textPrimary, SWIPE_ACTION_ICON_SIZE)}
      </View>
    ),
    [colors.successSurface, colors.textPrimary, rightSwipeAction, texts],
  );

  const renderRightActions = useCallback(
    () => (
      <View
        accessibilityLabel={getSwipeActionLabel(leftSwipeAction, texts)}
        style={[styles.action, styles.rightAction, { backgroundColor: colors.warningSurface }]}
      >
        {getSwipeActionIcon(leftSwipeAction, colors.textPrimary, SWIPE_ACTION_ICON_SIZE)}
      </View>
    ),
    [colors.textPrimary, colors.warningSurface, leftSwipeAction, texts],
  );

  const handleSwipeableOpen = useCallback(
    (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) => {
      swipeableRef.current?.close();

      if (previewMode) {
        return;
      }

      if (direction === SwipeDirection.LEFT) {
        onExecuteAction(contact, leftSwipeAction);
        return;
      }

      onExecuteAction(contact, rightSwipeAction);
    },
    [contact, leftSwipeAction, onExecuteAction, previewMode, rightSwipeAction],
  );

  const rowContent = (
    <Tappable
      accessibilityState={{ disabled: showDisabledStyle }}
      alignItems="center"
      animateOnly={["scale"]}
      backgroundColor={isRowSelected ? colors.selectionBackground : colors.surface}
      borderBottomColor={colors.border}
      borderBottomWidth={previewMode ? 0 : 1}
      delayLongPress={selectionMode ? undefined : UI_TIMING_MS.longPressDelay}
      flexDirection="row"
      justifyContent="space-between"
      minHeight={56}
      onLongPress={selectionMode ? undefined : handleLongPress}
      onPress={handlePress}
      opacity={showDisabledStyle ? DISABLED_ROW_OPACITY : 1}
      paddingHorizontal={16}
      transition={TAMAGUI_TRANSITION.quick}
      variant="default"
    >
      <View style={styles.leftSide}>
        <View
          style={[
            styles.avatar,
            isRowSelected
              ? [styles.avatarSelected, { backgroundColor: colors.selectionBackgroundStrong }]
              : shouldShowAvatarImage
                ? [styles.avatarImageBackground, { backgroundColor: colors.surfaceMuted }]
                : { backgroundColor: avatarColor },
          ]}
        >
          {isRowSelected ? (
            <IconCheck size={16} stroke={colors.textPrimary} />
          ) : shouldShowAvatarImage ? (
            <Image resizeMode="cover" source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
              {getContactInitials(contact)}
            </Text>
          )}
        </View>
        <Text numberOfLines={1} style={[styles.nameText, { color: colors.textPrimary }]}>
          {name}
        </Text>
      </View>
    </Tappable>
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
});

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  avatarImage: {
    borderRadius: 17,
    height: "100%",
    width: "100%",
  },
  avatarImageBackground: {},
  avatarSelected: {},
  avatarText: {
    fontSize: 12,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  leftAction: {},
  leftSide: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    paddingRight: 12,
  },
  nameText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  rightAction: {},
});
