import { useCallback, useEffect, useRef } from "react";
import {
  type AccessibilityActionEvent,
  FlatList,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WHEEL_PICKER_ITEM_HEIGHT, WHEEL_PICKER_VISIBLE_ROWS } from "../../../lib/config";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

const PICKER_HEIGHT = WHEEL_PICKER_ITEM_HEIGHT * WHEEL_PICKER_VISIBLE_ROWS;
const PADDING_ITEMS = Math.floor(WHEEL_PICKER_VISIBLE_ROWS / 2);

interface RotatingWheelColumnProps {
  accessibilityLabel: string;
  disabled?: boolean;
  items: string[];
  onIndexChange: (index: number) => void;
  selectedIndex: number;
}

export function RotatingWheelColumn({
  items,
  selectedIndex,
  onIndexChange,
  accessibilityLabel,
  disabled = false,
}: RotatingWheelColumnProps) {
  const colors = useMobileThemeColors();
  const listRef = useRef<FlatList<string>>(null);
  const isUserScrollingRef = useRef(false);

  const paddedData =
    items.length === 0
      ? []
      : [...Array(PADDING_ITEMS).fill(""), ...items, ...Array(PADDING_ITEMS).fill("")];

  const scrollToIndex = useCallback((index: number, animated = false) => {
    listRef.current?.scrollToOffset({
      animated,
      offset: index * WHEEL_PICKER_ITEM_HEIGHT,
    });
  }, []);

  useEffect(() => {
    if (items.length === 0 || isUserScrollingRef.current) {
      return;
    }

    const clamped = Math.min(Math.max(selectedIndex, 0), items.length - 1);
    scrollToIndex(clamped, false);
  }, [items.length, scrollToIndex, selectedIndex]);

  function handleScrollBegin() {
    isUserScrollingRef.current = true;
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    isUserScrollingRef.current = false;

    if (disabled || items.length === 0) {
      return;
    }

    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.round(offset / WHEEL_PICKER_ITEM_HEIGHT);
    const clamped = Math.min(Math.max(index, 0), items.length - 1);

    scrollToIndex(clamped, true);

    if (clamped !== selectedIndex) {
      onIndexChange(clamped);
    }
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    if (disabled || items.length === 0) {
      return;
    }

    if (event.nativeEvent.actionName === "increment") {
      const nextIndex = Math.min(selectedIndex + 1, items.length - 1);
      if (nextIndex !== selectedIndex) {
        onIndexChange(nextIndex);
        scrollToIndex(nextIndex, true);
      }
      return;
    }

    if (event.nativeEvent.actionName === "decrement") {
      const nextIndex = Math.max(selectedIndex - 1, 0);
      if (nextIndex !== selectedIndex) {
        onIndexChange(nextIndex);
        scrollToIndex(nextIndex, true);
      }
    }
  }

  function renderItem({ item, index }: ListRenderItemInfo<string>) {
    const isPadding = index < PADDING_ITEMS || index >= PADDING_ITEMS + items.length;
    const dataIndex = index - PADDING_ITEMS;
    const isSelected = !isPadding && dataIndex === selectedIndex;

    return (
      <View style={[styles.item, { height: WHEEL_PICKER_ITEM_HEIGHT }]}>
        {!isPadding ? (
          <Text
            numberOfLines={1}
            style={[
              styles.itemText,
              { color: isSelected ? colors.textPrimary : colors.textMuted },
              isSelected && styles.itemTextSelected,
            ]}
          >
            {item}
          </Text>
        ) : null}
      </View>
    );
  }

  if (items.length === 0) {
    return <View style={[styles.container, { height: PICKER_HEIGHT }]} />;
  }

  return (
    <View
      accessibilityActions={[
        { label: "Increment", name: "increment" },
        { label: "Decrement", name: "decrement" },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      onAccessibilityAction={handleAccessibilityAction}
      style={[styles.container, { height: PICKER_HEIGHT }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.selectionIndicator,
          {
            backgroundColor: colors.surfacePressed,
            borderColor: colors.border,
            height: WHEEL_PICKER_ITEM_HEIGHT,
            top: PADDING_ITEMS * WHEEL_PICKER_ITEM_HEIGHT,
          },
        ]}
      />
      <FlatList
        data={paddedData}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: WHEEL_PICKER_ITEM_HEIGHT,
          offset: WHEEL_PICKER_ITEM_HEIGHT * index,
        })}
        keyExtractor={(_, index) => `${accessibilityLabel}-${index}`}
        nestedScrollEnabled
        onMomentumScrollEnd={handleScrollEnd}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        ref={listRef}
        renderItem={renderItem}
        scrollEnabled={!disabled}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_PICKER_ITEM_HEIGHT}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  itemText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
  itemTextSelected: {
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  selectionIndicator: {
    borderRadius: 8,
    borderWidth: 1,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
});
