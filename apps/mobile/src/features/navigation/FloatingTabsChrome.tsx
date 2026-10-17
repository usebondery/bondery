import { useEffect, useRef } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContactsSelectionActionBar } from "../../components/ContactsSelectionActionBar";
import { FloatingChromeDock } from "../../components/chrome/FloatingChromeDock";
import { FloatingCreateContactButton } from "../../components/chrome/FloatingCreateContactButton";
import { getFloatingChromeSafePadding } from "../../components/chrome/floatingChromeTokens";
import type { NativeViewRef } from "../../lib/native-host-refs";
import { MOBILE_Z_INDEX } from "../../theme/tokens";
import { FloatingBubbleTabBar } from "./FloatingBubbleTabBar";
import { useFloatingChrome } from "./floatingChromeContext";
import { useReportFloatingChromeBottomInset } from "./floatingChromeInsetsContext";
import { useTabBarProps } from "./tabBarPropsContext";

/**
 * Sibling overlay above tab screens: floating tab bar (or selection action bar).
 */
export function FloatingTabsChrome() {
  const insets = useSafeAreaInsets();
  const tabBarProps = useTabBarProps();
  const { actionBarSlot } = useFloatingChrome();
  const reportBottomInset = useReportFloatingChromeBottomInset();
  const chromeRef = useRef<NativeViewRef>(null);

  const focusedRoute = tabBarProps?.state.routes[tabBarProps.state.index]?.name;
  const showActionBar = actionBarSlot === "contacts-selection" && focusedRoute === "contacts";

  function handleChromeLayout(event: LayoutChangeEvent) {
    const chromeHeight = event.nativeEvent.layout.height;
    reportBottomInset(chromeHeight + getFloatingChromeSafePadding(insets.bottom));
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      chromeRef.current?.measure((_x, _y, _width, height) => {
        if (height <= 0) {
          return;
        }

        reportBottomInset(height + getFloatingChromeSafePadding(insets.bottom));
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
    <FloatingChromeDock
      elevation={MOBILE_Z_INDEX.fabChrome}
      hostFullWidth={!showActionBar}
      onLayout={handleChromeLayout}
      ref={chromeRef}
      zIndex={MOBILE_Z_INDEX.fabChrome}
    >
      {showActionBar ? (
        <ContactsSelectionActionBar />
      ) : (
        <View
          pointerEvents="box-none"
          style={{ alignItems: "center", flexDirection: "row", width: "100%" }}
        >
          <View pointerEvents="none" style={{ flex: 1 }} />
          <FloatingBubbleTabBar {...tabBarProps} />
          <View style={{ alignItems: "flex-end", flex: 1 }}>
            <FloatingCreateContactButton />
          </View>
        </View>
      )}
    </FloatingChromeDock>
  );
}
