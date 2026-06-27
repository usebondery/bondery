import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Swipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { IconCheck } from "@tabler/icons-react-native";
import type { Contact } from "@bondery/schemas";
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
  selected: boolean;
  selectionMode: boolean;
  isDisabled?: boolean;
  isSwipeEnabled?: boolean;
  previewMode?: boolean;
  leftSwipeAction: SwipeAction;
  rightSwipeAction: SwipeAction;
  texts: {
    call: string;
    message: string;
    email: string;
  };
  onToggleSelect: (contactId: string) => void;
  onEnterSelection: (contactId: string) => void;
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
  onPress?: (contactId: string) => void;
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
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const avatarUri = contact.avatar ? normalizeMobileUrlForDevice(contact.avatar) : undefined;
  const swipeGesturesEnabled = isSwipeEnabled && !selectionMode;
  const showDisabledStyle = isDisabled && selectionMode;
  const isRowSelected = selected && !showDisabledStyle;

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [contact.avatar]);

  useEffect(() => {
    if (selectionMode) {
      swipeableRef.current?.close();
    }
  }, [selectionMode]);

  const shouldShowAvatarImage = !!avatarUri && !avatarImageFailed && !isRowSelected;

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
        style={[styles.action, styles.leftAction, { backgroundColor: colors.successSurface }]}
        accessibilityLabel={getSwipeActionLabel(rightSwipeAction, texts)}
      >
        {getSwipeActionIcon(rightSwipeAction, colors.textPrimary, SWIPE_ACTION_ICON_SIZE)}
      </View>
    ),
    [colors.successSurface, colors.textPrimary, rightSwipeAction, texts],
  );

  const renderRightActions = useCallback(
    () => (
      <View
        style={[styles.action, styles.rightAction, { backgroundColor: colors.warningSurface }]}
        accessibilityLabel={getSwipeActionLabel(leftSwipeAction, texts)}
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
      variant="default"
      transition={TAMAGUI_TRANSITION.quick}
      animateOnly={["scale"]}
      delayLongPress={selectionMode ? undefined : UI_TIMING_MS.longPressDelay}
      onLongPress={selectionMode ? undefined : handleLongPress}
      onPress={handlePress}
      minHeight={56}
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={16}
      borderBottomWidth={previewMode ? 0 : 1}
      backgroundColor={isRowSelected ? colors.selectionBackground : colors.surface}
      borderBottomColor={colors.border}
      opacity={showDisabledStyle ? DISABLED_ROW_OPACITY : 1}
      accessibilityState={{ disabled: showDisabledStyle }}
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
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={() => setAvatarImageFailed(true)}
            />
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
        ref={swipeableRef}
        enabled={swipeGesturesEnabled}
        friction={2}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpen={handleSwipeableOpen}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
      >
        {rowContent}
      </Swipeable>
    </View>
  );
});

const styles = StyleSheet.create({
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSelected: {},
  avatarImageBackground: {},
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },
  nameText: {
    fontSize: 16,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    flexShrink: 1,
  },
  action: {
    justifyContent: "center",
    width: 100,
    alignItems: "center",
  },
  leftAction: {},
  rightAction: {},
});
