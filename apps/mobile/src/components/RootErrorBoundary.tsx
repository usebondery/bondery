import { Component, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MobileThemeColors } from "../theme/colors";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../theme/tokens";

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

type RootErrorBoundaryProps = {
  children: ReactNode;
  colors: MobileThemeColors;
};

/**
 * Isolated from `app/_layout.tsx` so Fast Refresh does not mix a class and the
 * route default export in one file.
 */
export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    const { colors } = this.props;

    if (this.state.hasError) {
      return (
        <View style={[styles.errorScreen, { backgroundColor: colors.appBackground }]}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Mobile app runtime error
          </Text>
          <Text style={[styles.errorMessage, { color: colors.dangerText }]}>
            {this.state.message || "Unknown error"}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorMessage: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
  errorScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
  errorTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sheetTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    marginBottom: 8,
  },
});
