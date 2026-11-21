import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
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

/** A class cannot call a hook, so the fallback is a function component under the provider. */
function RuntimeErrorScreen({ colors, message }: { colors: MobileThemeColors; message: string }) {
  const t = useCommonTranslations();

  return (
    <View style={[styles.errorScreen, { backgroundColor: colors.appBackground }]}>
      <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
        {t("feedback.mobileRuntimeError")}
      </Text>
      <Text style={[styles.errorMessage, { color: colors.dangerText }]}>
        {message || t("feedback.unknownError")}
      </Text>
    </View>
  );
}

/**
 * Isolated from `app/_layout.tsx` so Fast Refresh does not mix a class and the
 * route default export in one file.
 */
export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  lastComponentStack = "";

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

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.setState({
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    });
    this.lastComponentStack = info.componentStack ?? "";
  }

  override render() {
    const { colors } = this.props;

    if (this.state.hasError) {
      return <RuntimeErrorScreen colors={colors} message={this.state.message} />;
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
