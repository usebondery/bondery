import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { IconPlus, IconX } from "@tabler/icons-react-native";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import {
  BackHandler,
  type LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
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
import { useMobileNavigationTranslations } from "../../lib/i18n/generated/hooks";
import { FAB_SPEED_DIAL_MOTION, TAMAGUI_TRANSITION } from "../../theme/animations";
import { floatingBarStyles } from "../../theme/floatingBarStyles";
import { Tappable } from "../../theme/Tappable";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { estimateFabMenuContentHeight, FabSpeedDialMenuItem } from "./FabSpeedDialMenuItem";
import { FabSpeedDialOverflowSheet } from "./FabSpeedDialOverflowSheet";
import { useFabSpeedDial } from "./fabSpeedDialContext";
import type { FabSpeedDialMenuItemLayout } from "./fabSpeedDialTypes";
import { useFabPlusGesture } from "./useFabPlusGesture";

type RootTabRoute = "contacts" | "settings";

const CHROME_RADIUS_CLOSED = MOBILE_LAYOUT.borderRadius.pill;
const CHROME_RADIUS_OPEN = MOBILE_LAYOUT.floatingTabBar.speedDialChromeRadiusOpen;

interface FloatingBubbleTabBarProps
  extends Pick<BottomTabBarProps, "descriptors" | "navigation" | "state"> {
  onChromeBoundsChange?: (event: LayoutChangeEvent) => void;
}

/**
 * Floating bubble tab bar used on root tab pages.
 */
export const FloatingBubbleTabBar = forwardRef<View, FloatingBubbleTabBarProps>(
  function FloatingBubbleTabBar(
    { state, descriptors, navigation, onChromeBoundsChange },
    forwardedRef,
  ) {
    const tMobileNavigation = useMobileNavigationTranslations();
    const insets = useSafeAreaInsets();
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
    const dimensionsRef = useRef({ height: windowHeight, width: windowWidth });
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

    const plusGesture = useFabPlusGesture({ getPlusCancelY, measurePlusBubble });

    const handleMenuContentLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const measuredHeight = event.nativeEvent.layout.height;
        if (measuredHeight <= 0) {
          return;
        }

        menuTargetHeight.value = measuredHeight;

        if (isOpen) {
          menuHeight.value = withSpring(measuredHeight, FAB_SPEED_DIAL_MOTION.openSpring);
        }
      },
      [isOpen, menuHeight, menuTargetHeight],
    );

    const handleChromeLayout = useCallback(
      (event: LayoutChangeEvent) => {
        measurePlusBubble();
        onChromeBoundsChange?.(event);
      },
      [measurePlusBubble, onChromeBoundsChange],
    );

    useEffect(() => {
      void windowWidth;
      void windowHeight;
      void insets.bottom;
      void isOpen;
      measurePlusBubble();
    }, [insets.bottom, isOpen, measurePlusBubble, windowHeight, windowWidth]);

    useEffect(() => {
      const targetHeight = Math.max(menuTargetHeight.value, estimatedMenuHeight);

      if (isOpen && usesInlineMenu) {
        menuHeight.value = withSpring(targetHeight, FAB_SPEED_DIAL_MOTION.openSpring);
        return;
      }

      menuHeight.value = withTiming(0, { duration: FAB_SPEED_DIAL_MOTION.closeDurationMs });
    }, [estimatedMenuHeight, isOpen, menuHeight, menuTargetHeight, usesInlineMenu]);

    useEffect(() => {
      const previous = dimensionsRef.current;
      if (previous.width === windowWidth && previous.height === windowHeight) {
        return;
      }

      dimensionsRef.current = { height: windowHeight, width: windowWidth };

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
      const routeIndex = state.routes.findIndex(
        (route: { name: string }) => route.name === routeName,
      );

      if (routeIndex < 0) {
        return null;
      }

      const route = state.routes[routeIndex];
      const descriptor = descriptors[route.key];
      const options = descriptor.options;
      const isFocused = state.index === routeIndex;
      const defaultLabel =
        routeName === "contacts" ? tMobileNavigation("Contacts") : tMobileNavigation("Settings");

      const icon = options.tabBarIcon
        ? options.tabBarIcon({
            color: isFocused ? colors.textOnPrimary : colors.iconSecondary,
            focused: isFocused,
            size: 22,
          })
        : null;

      const onPress = () => {
        const shouldNavigate = !isFocused;
        closeMenu();
        closeOverflowSheet();

        const event = navigation.emit({
          canPreventDefault: true,
          target: route.key,
          type: "tabPress",
        });

        if (shouldNavigate && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      };

      const onLongPress = () => {
        navigation.emit({
          target: route.key,
          type: "tabLongPress",
        });
      };

      return (
        <Tappable
          accessibilityLabel={options.tabBarAccessibilityLabel ?? defaultLabel}
          accessibilityRole="tab"
          accessibilityState={isFocused ? { selected: true } : {}}
          key={route.key}
          onLongPress={onLongPress}
          onPress={onPress}
          pressStyle={{ opacity: 0.9, transition: TAMAGUI_TRANSITION.quick }}
          style={[
            styles.tabBubble,
            { backgroundColor: isFocused ? colors.primary : "transparent" },
          ]}
          testID={options.tabBarButtonTestID}
          variant="subtle"
        >
          {icon}
        </Tappable>
      );
    };

    return (
      <>
        <View
          collapsable={false}
          onLayout={handleChromeLayout}
          ref={assignChromeMeasureRef}
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
                pointerEvents={isOpen ? "auto" : "none"}
                style={[floatingBarStyles.speedDialMenuColumn, menuColumnAnimatedStyle]}
              >
                <View
                  onLayout={handleMenuContentLayout}
                  style={{
                    gap: MOBILE_LAYOUT.floatingTabBar.speedDialItemGap,
                    paddingBottom: MOBILE_LAYOUT.floatingTabBar.speedDialMenuPadding,
                  }}
                >
                  {actions.map((action, index) => (
                    <FabSpeedDialMenuItem
                      action={action}
                      isHighlighted={highlightedActionId === action.id}
                      isLast={index === actions.length - 1}
                      key={action.id}
                      onLayoutMeasured={handleItemLayoutMeasured}
                      onPress={() => runAction(action.id)}
                    />
                  ))}
                </View>
              </Animated.View>
            ) : null}

            <View style={floatingBarStyles.tabRailRow}>
              {renderTabBubble("contacts")}

              <View
                collapsable={false}
                onLayout={measurePlusBubble}
                ref={plusRef}
                style={styles.plusWrap}
              >
                <GestureDetector gesture={plusGesture}>
                  <Tappable
                    accessibilityLabel={
                      isOpen ? tMobileNavigation("CloseAddMenu") : tMobileNavigation("Add")
                    }
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    delayLongPress={UI_TIMING_MS.fabDragRevealMs}
                    onLongPress={handlePlusLongPress}
                    onPress={handlePlusPress}
                    pressStyle={{ opacity: 0.9, transition: TAMAGUI_TRANSITION.quick }}
                    style={[
                      styles.plusBubble,
                      {
                        backgroundColor: isOpen ? colors.primary : colors.surface,
                        borderColor: isOpen ? colors.primary : colors.borderStrong,
                      },
                    ]}
                    variant="subtle"
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
    alignSelf: "center",
    maxWidth: 240,
    width: "100%",
  },
  plusBubble: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.floatingTabBar.plusBubble / 2,
    borderWidth: 1,
    height: MOBILE_LAYOUT.floatingTabBar.plusBubble,
    justifyContent: "center",
    width: MOBILE_LAYOUT.floatingTabBar.plusBubble,
  },
  plusWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabBubble: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.floatingTabBar.tabBubble / 2,
    height: MOBILE_LAYOUT.floatingTabBar.tabBubble,
    justifyContent: "center",
    width: MOBILE_LAYOUT.floatingTabBar.tabBubble,
  },
});
