import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { useResolvedMobileTheme } from "../../theme/useResolvedMobileTheme";

/**
 * Global status bar appearance synced to the resolved in-app theme.
 * Light backgrounds use dark icons; dark backgrounds use light icons.
 */
export function AppStatusBar() {
  const resolvedTheme = useResolvedMobileTheme();

  return (
    <StatusBar
      animated
      style={resolvedTheme === "dark" ? "light" : "dark"}
      translucent={Platform.OS === "android"}
    />
  );
}
