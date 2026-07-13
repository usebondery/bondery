import { type LayoutChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContactsSelectionActionBar } from "../../components/ContactsSelectionActionBar";
import { floatingBarStyles } from "../../theme/floatingBarStyles";
import { MOBILE_Z_INDEX } from "../../theme/tokens";
import { FabSpeedDialScrim } from "./FabSpeedDialScrim";
import { FloatingBubbleTabBar } from "./FloatingBubbleTabBar";
import { useFabSpeedDial } from "./fabSpeedDialContext";
import { useFloatingChrome } from "./floatingChromeContext";
import { useReportFloatingChromeBottomInset } from "./floatingChromeInsetsContext";
import { useTabBarProps } from "./tabBarPropsContext";

/**
 * Sibling overlay above tab screens: dim scrim (middle) + floating tab bar (top).
 */
export function FloatingTabsChrome() {
  const insets = useSafeAreaInsets();
  const tabBarProps = useTabBarProps();
  const { actionBarSlot } = useFloatingChrome();
  const reportBottomInset = useReportFloatingChromeBottomInset();
  const { isOpen, usesInlineMenu, tryDismissFromScrim } = useFabSpeedDial();
  const hostRef = useRef<View>(null);
  const chromeRef = useRef<View>(null);
  const [scrimHeight, setScrimHeight] = useState(0);

  const measureScrimHeight = useCallback(() => {
    const host = hostRef.current;
    const chrome = chromeRef.current;

    if (!host || !chrome) {
      return;
    }

    chrome.measureLayout(
      host,
      (_left, top) => {
        setScrimHeight(Math.max(0, Math.round(top)));
      },
      () => {
        requestAnimationFrame(measureScrimHeight);
      },
    );
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    measureScrimHeight();
    const frame = requestAnimationFrame(measureScrimHeight);
    const settleTimer = setTimeout(measureScrimHeight, 50);
    const interval = setInterval(measureScrimHeight, 32);

    const stopInterval = setTimeout(() => {
      clearInterval(interval);
    }, 400);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      clearTimeout(stopInterval);
      clearInterval(interval);
    };
  }, [isOpen, measureScrimHeight]);

  const focusedRoute = tabBarProps?.state.routes[tabBarProps.state.index]?.name;
  const showActionBar = actionBarSlot === "contacts-selection" && focusedRoute === "contacts";

  const handleChromeLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const chromeHeight = event.nativeEvent.layout.height;
      const safeAreaPadding = Math.max(insets.bottom, 8);
      reportBottomInset(chromeHeight + safeAreaPadding);
      measureScrimHeight();
    },
    [insets.bottom, measureScrimHeight, reportBottomInset],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      chromeRef.current?.measure((_x, _y, _width, height) => {
        if (height <= 0) {
          return;
        }

        reportBottomInset(height + Math.max(insets.bottom, 8));
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [insets.bottom, reportBottomInset]);

  if (!tabBarProps) {
    return null;
  }

  return (
    <View
      collapsable={false}
      onLayout={measureScrimHeight}
      pointerEvents="box-none"
      ref={hostRef}
      style={[floatingBarStyles.host, { zIndex: MOBILE_Z_INDEX.fabChrome }]}
    >
      {usesInlineMenu ? (
        <FabSpeedDialScrim height={scrimHeight} onDismiss={tryDismissFromScrim} visible={isOpen} />
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          floatingBarStyles.chromeContainer,
          {
            elevation: MOBILE_Z_INDEX.fabChrome + 1,
            paddingBottom: Math.max(insets.bottom, 8),
            zIndex: MOBILE_Z_INDEX.fabChrome + 1,
          },
        ]}
      >
        {showActionBar ? (
          <View
            collapsable={false}
            onLayout={handleChromeLayout}
            pointerEvents="box-none"
            ref={chromeRef}
            style={{ alignItems: "center", width: "100%" }}
          >
            <ContactsSelectionActionBar />
          </View>
        ) : (
          <FloatingBubbleTabBar
            ref={chromeRef}
            {...tabBarProps}
            onChromeBoundsChange={handleChromeLayout}
          />
        )}
      </View>
    </View>
  );
}
