import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContactsSelectionActionBar } from "../../components/ContactsSelectionActionBar";
import { floatingBarStyles } from "../../theme/floatingBarStyles";
import { MOBILE_Z_INDEX } from "../../theme/tokens";
import { useFloatingChrome } from "./floatingChromeContext";
import { FabSpeedDialScrim } from "./FabSpeedDialScrim";
import { useFabSpeedDial } from "./fabSpeedDialContext";
import { FloatingBubbleTabBar } from "./FloatingBubbleTabBar";
import { useTabBarProps } from "./tabBarPropsContext";

/**
 * Sibling overlay above tab screens: dim scrim (middle) + floating tab bar (top).
 */
export function FloatingTabsChrome() {
  const insets = useSafeAreaInsets();
  const tabBarProps = useTabBarProps();
  const { actionBarSlot } = useFloatingChrome();
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

  if (!tabBarProps) {
    return null;
  }

  const focusedRoute = tabBarProps.state.routes[tabBarProps.state.index]?.name;
  const showActionBar = actionBarSlot === "contacts-selection" && focusedRoute === "contacts";

  return (
    <View
      ref={hostRef}
      collapsable={false}
      pointerEvents="box-none"
      onLayout={measureScrimHeight}
      style={[floatingBarStyles.host, { zIndex: MOBILE_Z_INDEX.fabChrome }]}
    >
      {usesInlineMenu ? (
        <FabSpeedDialScrim
          visible={isOpen}
          height={scrimHeight}
          onDismiss={tryDismissFromScrim}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          floatingBarStyles.chromeContainer,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            zIndex: MOBILE_Z_INDEX.fabChrome + 1,
            elevation: MOBILE_Z_INDEX.fabChrome + 1,
          },
        ]}
      >
        {showActionBar ? (
          <View
            ref={chromeRef}
            collapsable={false}
            onLayout={measureScrimHeight}
            pointerEvents="box-none"
            style={{ width: "100%", alignItems: "center" }}
          >
            <ContactsSelectionActionBar />
          </View>
        ) : (
          <FloatingBubbleTabBar
            ref={chromeRef}
            {...tabBarProps}
            onChromeBoundsChange={measureScrimHeight}
          />
        )}
      </View>
    </View>
  );
}
