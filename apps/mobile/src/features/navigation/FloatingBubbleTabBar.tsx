import { IconPlus, IconX } from "@tabler/icons-react-native";
import { forwardRef, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  BackHandler,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FAB_GESTURE, UI_TIMING_MS } from "../../lib/config";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { FAB_SPEED_DIAL_MOTION, TAMAGUI_TRANSITION } from "../../theme/animations";
import { Tappable } from "../../theme/Tappable";
import { floatingBarStyles } from "../../theme/floatingBarStyles";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import {
  estimateFabMenuContentHeight,
  FabSpeedDialMenuItem,
} from "./FabSpeedDialMenuItem";
import { FabSpeedDialOverflowSheet } from "./FabSpeedDialOverflowSheet";
import { useFabSpeedDial } from "./fabSpeedDialContext";
import type { FabSpeedDialMenuItemLayout } from "./fabSpeedDialTypes";
import { useFabPlusGesture } from "./useFabPlusGesture";

type RootTabRoute = "contacts" | "settings";

const CHROME_RADIUS_CLOSED = MOBILE_LAYOUT.borderRadius.pill;
const CHROME_RADIUS_OPEN = MOBILE_LAYOUT.floatingTabBar.speedDialChromeRadiusOpen;

interface FloatingBubbleTabBarProps {
  state: any;
  descriptors: Record<
    string,
    {
      options: {
        tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
        tabBarAccessibilityLabel?: string;
        tabBarButtonTestID?: string;
      };
    }
  >;
  navigation: any;
  onChromeBoundsChange?: () => void;
}

/**
 * Floating bubble tab bar used on root tab pages.
 */
export const FloatingBubbleTabBar = forwardRef<View, FloatingBubbleTabBarProps>(
  function FloatingBubbleTabBar(
    { state, descriptors, navigation, onChromeBoundsChange },
    forwardedRef,
  ) {
  const insets = useSafeAreaInsets();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const plusRef = useRef<View>(null);
  const chromeMeasureRef = useRef<View>(null);

  const assignChromeMeasureRef = useCallback(
    (node: View | null) => {
      chromeMeasureRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
        return;
      }
      if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );
  const plusCancelYRef = useRef<number | null>(null);
  const dimensionsRef = useRef({ width: windowWidth, height: windowHeight });
  const suppressNextPressRef = useRef(false);

  const {
    actions,
    isOpen,
    isOverflowSheetOpen,
    highlightedActionId,
    usesInlineMenu,
    closeMenu,
    closeOverflowSheet,
    openMenu,
    toggleMenu,
    registerMenuItemLayout,
    runAction,
  } = useFabSpeedDial();

  const menuHeight = useSharedValue(0);
  const menuTargetHeight = useSharedValue(estimateFabMenuContentHeight(actions.length));

  const estimatedMenuHeight = useMemo(
    () => estimateFabMenuContentHeight(actions.length),
    [actions.length],
  );

  useEffect(() => {
    menuTargetHeight.value = estimatedMenuHeight;
  }, [estimatedMenuHeight, menuTargetHeight]);

  const measurePlusBubble = useCallback(() => {
    plusRef.current?.measureInWindow((_x, y, _width, height) => {
      plusCancelYRef.current = y + height / 2 + FAB_GESTURE.cancelZoneBelowPx;
    });
  }, []);

  const getPlusCancelY = useCallback(() => plusCancelYRef.current, []);

  const plusGesture = useFabPlusGesture({ measurePlusBubble, getPlusCancelY });

  const handleMenuContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measuredHeight = event.nativeEvent.layout.height;
      if (measuredHeight <= 0) {
        return;
      }

      menuTargetHeight.value = measuredHeight;

      if (isOpen) {
        menuHeight.value = withSpring(measuredHeight, FAB_SPEED_DIAL_MOTION.openSpring);
        onChromeBoundsChange?.();
      }
    },
    [isOpen, menuHeight, menuTargetHeight, onChromeBoundsChange],
  );

  const handleChromeLayout = useCallback(() => {
    measurePlusBubble();
    onChromeBoundsChange?.();
  }, [measurePlusBubble, onChromeBoundsChange]);

  useEffect(() => {
    measurePlusBubble();
  }, [measurePlusBubble, windowWidth, windowHeight, insets.bottom, isOpen]);

  useEffect(() => {
    const targetHeight = Math.max(menuTargetHeight.value, estimatedMenuHeight);

    if (isOpen && usesInlineMenu) {
      menuHeight.value = withSpring(targetHeight, FAB_SPEED_DIAL_MOTION.openSpring);
      onChromeBoundsChange?.();
      return;
    }

    menuHeight.value = withTiming(0, { duration: FAB_SPEED_DIAL_MOTION.closeDurationMs });
    onChromeBoundsChange?.();
  }, [estimatedMenuHeight, isOpen, menuHeight, menuTargetHeight, onChromeBoundsChange, usesInlineMenu]);

  useEffect(() => {
    const previous = dimensionsRef.current;
    if (previous.width === windowWidth && previous.height === windowHeight) {
      return;
    }

    dimensionsRef.current = { width: windowWidth, height: windowHeight };

    if (isOpen) {
      closeMenu();
    }
  }, [closeMenu, isOpen, windowHeight, windowWidth]);

  useEffect(() => {
    if (!isOpen && !isOverflowSheetOpen) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeMenu();
      closeOverflowSheet();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [closeMenu, closeOverflowSheet, isOpen, isOverflowSheetOpen]);

  const menuColumnAnimatedStyle = useAnimatedStyle(() => ({
    height: menuHeight.value,
  }));

  const chromeAnimatedStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(
      menuHeight.value,
      [0, Math.max(menuTargetHeight.value, 1)],
      [CHROME_RADIUS_CLOSED, CHROME_RADIUS_OPEN],
      Extrapolation.CLAMP,
    ),
  }));

  const handleItemLayoutMeasured = useCallback(
    (layout: FabSpeedDialMenuItemLayout) => {
      registerMenuItemLayout(layout);
    },
    [registerMenuItemLayout],
  );

  const handlePlusPress = () => {
    if (suppressNextPressRef.current) {
      suppressNextPressRef.current = false;
      return;
    }

    measurePlusBubble();
    toggleMenu();
  };

  const handlePlusLongPress = () => {
    suppressNextPressRef.current = true;
    measurePlusBubble();

    if (!isOpen && usesInlineMenu) {
      openMenu();
    }
  };

  const renderTabBubble = (routeName: RootTabRoute) => {
    const routeIndex = state.routes.findIndex((route: { name: string }) => route.name === routeName);

    if (routeIndex < 0) {
      return null;
    }

    const route = state.routes[routeIndex];
    const descriptor = descriptors[route.key];
    const options = descriptor.options;
    const isFocused = state.index === routeIndex;
    const defaultLabel =
      routeName === "contacts"
        ? t("MobileApp.Navigation.Contacts")
        : t("MobileApp.Navigation.Settings");

    const icon = options.tabBarIcon
      ? options.tabBarIcon({
          focused: isFocused,
          color: isFocused ? colors.textOnPrimary : colors.iconSecondary,
          size: 22,
        })
      : null;

    const onPress = () => {
      const shouldNavigate = !isFocused;
      closeMenu();
      closeOverflowSheet();

      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (shouldNavigate && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    return (
      <Tappable
        key={route.key}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? defaultLabel}
        testID={options.tabBarButtonTestID}
        variant="subtle"
        style={[
          styles.tabBubble,
          { backgroundColor: isFocused ? colors.primary : "transparent" },
        ]}
        pressStyle={{ opacity: 0.9, transition: TAMAGUI_TRANSITION.quick }}
      >
        {icon}
      </Tappable>
    );
  };

  return (
    <>
      <View
        ref={assignChromeMeasureRef}
        collapsable={false}
        onLayout={handleChromeLayout}
        style={styles.chromeMeasureHost}
      >
        <Animated.View
            style={[
              floatingBarStyles.speedDialChrome,
              chromeAnimatedStyle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
                shadowColor: colors.shadow,
              },
            ]}
          >
            {usesInlineMenu ? (
              <Animated.View
                style={[floatingBarStyles.speedDialMenuColumn, menuColumnAnimatedStyle]}
                pointerEvents={isOpen ? "auto" : "none"}
              >
                <View
                  onLayout={handleMenuContentLayout}
                  style={{
                    paddingBottom: MOBILE_LAYOUT.floatingTabBar.speedDialMenuPadding,
                    gap: MOBILE_LAYOUT.floatingTabBar.speedDialItemGap,
                  }}
                >
                  {actions.map((action, index) => (
                    <FabSpeedDialMenuItem
                      key={action.id}
                      action={action}
                      isHighlighted={highlightedActionId === action.id}
                      isLast={index === actions.length - 1}
                      onPress={() => runAction(action.id)}
                      onLayoutMeasured={handleItemLayoutMeasured}
                    />
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <View style={floatingBarStyles.tabRailRow}>
              {renderTabBubble("contacts")}

              <View
                ref={plusRef}
                style={styles.plusWrap}
                onLayout={measurePlusBubble}
                collapsable={false}
              >
                <GestureDetector gesture={plusGesture}>
                  <Tappable
                    onPress={handlePlusPress}
                    onLongPress={handlePlusLongPress}
                    delayLongPress={UI_TIMING_MS.fabDragRevealMs}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isOpen
                        ? t("MobileApp.Navigation.CloseAddMenu")
                        : t("MobileApp.Navigation.Add")
                    }
                    accessibilityState={{ expanded: isOpen }}
                    variant="subtle"
                    style={[
                      styles.plusBubble,
                      {
                        backgroundColor: isOpen ? colors.primary : colors.surface,
                        borderColor: isOpen ? colors.primary : colors.borderStrong,
                      },
                    ]}
                    pressStyle={{ opacity: 0.9, transition: TAMAGUI_TRANSITION.quick }}
                  >
                    {isOpen ? (
                      <IconX size={22} stroke={colors.textOnPrimary} />
                    ) : (
                      <IconPlus size={24} stroke={colors.iconSecondary} />
                    )}
                  </Tappable>
                </GestureDetector>
              </View>

              {renderTabBubble("settings")}
            </View>
        </Animated.View>
      </View>

      <FabSpeedDialOverflowSheet />
    </>
  );
},
);

const styles = StyleSheet.create({
  chromeMeasureHost: {
    width: "100%",
    maxWidth: 240,
    alignSelf: "center",
  },
  tabBubble: {
    width: MOBILE_LAYOUT.floatingTabBar.tabBubble,
    height: MOBILE_LAYOUT.floatingTabBar.tabBubble,
    borderRadius: MOBILE_LAYOUT.floatingTabBar.tabBubble / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBubble: {
    width: MOBILE_LAYOUT.floatingTabBar.plusBubble,
    height: MOBILE_LAYOUT.floatingTabBar.plusBubble,
    borderRadius: MOBILE_LAYOUT.floatingTabBar.plusBubble / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  plusWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
