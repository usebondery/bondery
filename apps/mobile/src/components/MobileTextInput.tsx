import { forwardRef, memo, type ReactNode, useCallback, useEffect, useState } from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { UI_TIMING_MS } from "../lib/config";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

type MobileTextInputSize = "default" | "compact";

const WRAPPER_LAYOUT_KEYS = new Set<keyof ViewStyle>([
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
]);

function splitContainerStyle(containerStyle: StyleProp<ViewStyle>) {
  const flat = StyleSheet.flatten(containerStyle);
  if (!flat) {
    return { fillsWrapper: false, innerContainerStyle: undefined, wrapperStyle: undefined };
  }

  const wrapperStyle: ViewStyle = {};
  const innerContainerStyle: ViewStyle = {};

  for (const [key, value] of Object.entries(flat) as Array<
    [keyof ViewStyle, ViewStyle[keyof ViewStyle]]
  >) {
    if (WRAPPER_LAYOUT_KEYS.has(key)) {
      wrapperStyle[key] = value;
    } else {
      innerContainerStyle[key] = value;
    }
  }

  const fillsWrapper =
    wrapperStyle.flex != null ||
    wrapperStyle.flexGrow != null ||
    wrapperStyle.width === "100%" ||
    wrapperStyle.alignSelf === "stretch";

  return { fillsWrapper, innerContainerStyle, wrapperStyle };
}

export type MobileTextInputProps = TextInputProps & {
  error?: boolean;
  errorMessage?: string;
  description?: string;
  leadingIcon?: ReactNode;
  trailingAccessory?: ReactNode;
  /** When true (default), shows `current/max` in the trailing section while focused if `maxLength` is set. */
  showMaxLengthCounter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  size?: MobileTextInputSize;
  unfocusedBorderColor?: string;
  backgroundColor?: string;
};

export const MobileTextInput = memo(
  forwardRef<TextInput, MobileTextInputProps>(function MobileTextInput(
    {
      error = false,
      errorMessage,
      description,
      leadingIcon,
      trailingAccessory,
      showMaxLengthCounter = true,
      containerStyle,
      size = "default",
      unfocusedBorderColor,
      backgroundColor,
      style,
      onFocus,
      onBlur,
      editable = true,
      placeholderTextColor,
      maxLength,
      value,
      defaultValue,
      ...rest
    },
    ref,
  ) {
    const colors = useMobileThemeColors();
    const focusProgress = useSharedValue(0);
    const [isFocused, setIsFocused] = useState(false);
    const idleBorderColor = unfocusedBorderColor ?? colors.border;
    const fieldBackgroundColor = backgroundColor ?? colors.inputBackground;

    const currentLength = String(value ?? defaultValue ?? "").length;
    const shouldShowMaxLengthCounter =
      showMaxLengthCounter &&
      isFocused &&
      typeof maxLength === "number" &&
      Number.isFinite(maxLength);

    useEffect(() => {
      if (error) {
        focusProgress.value = 0;
      }
    }, [error, focusProgress]);

    const animatedContainerStyle = useAnimatedStyle(() => {
      if (error) {
        return { borderColor: colors.dangerAccent };
      }

      return {
        borderColor: interpolateColor(
          focusProgress.value,
          [0, 1],
          [idleBorderColor, colors.primary],
        ),
      };
    }, [error, idleBorderColor, colors.dangerAccent, colors.primary]);

    const handleFocus = useCallback(
      (event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
        setIsFocused(true);
        if (!error && editable !== false) {
          focusProgress.value = withTiming(1, {
            duration: UI_TIMING_MS.inputFocusTransition,
          });
        }
        onFocus?.(event);
      },
      [editable, error, focusProgress, onFocus],
    );

    const handleBlur = useCallback(
      (event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
        setIsFocused(false);
        focusProgress.value = withTiming(0, {
          duration: UI_TIMING_MS.inputFocusTransition,
        });
        onBlur?.(event);
      },
      [focusProgress, onBlur],
    );

    const trailingContent =
      shouldShowMaxLengthCounter || trailingAccessory ? (
        <View style={styles.trailingSection}>
          {shouldShowMaxLengthCounter ? (
            <Text style={[styles.maxLengthCounter, { color: colors.textMuted }]}>
              {currentLength}/{maxLength}
            </Text>
          ) : null}
          {trailingAccessory ? (
            <View style={styles.trailingAccessory}>{trailingAccessory}</View>
          ) : null}
        </View>
      ) : null;

    const { wrapperStyle, innerContainerStyle, fillsWrapper } = splitContainerStyle(containerStyle);

    return (
      <View style={[styles.wrapper, wrapperStyle]}>
        <Animated.View
          style={[
            styles.container,
            size === "compact" ? styles.containerCompact : styles.containerDefault,
            { backgroundColor: fieldBackgroundColor },
            fillsWrapper ? styles.containerFill : null,
            animatedContainerStyle,
            innerContainerStyle,
          ]}
        >
          {leadingIcon ? <View style={styles.leadingIcon}>{leadingIcon}</View> : null}

          <TextInput
            ref={ref}
            {...rest}
            defaultValue={defaultValue}
            editable={editable}
            maxLength={maxLength}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholderTextColor={placeholderTextColor ?? colors.textMuted}
            style={[
              styles.input,
              size === "compact" ? styles.inputCompact : styles.inputDefault,
              { color: colors.textPrimary },
              style,
            ]}
            value={value}
          />

          {trailingContent}
        </Animated.View>

        {errorMessage ? (
          <Text style={[styles.errorMessage, { color: colors.dangerText }]}>{errorMessage}</Text>
        ) : description ? (
          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
  },
  containerCompact: {
    minHeight: MOBILE_LAYOUT.inputCompact,
    paddingHorizontal: 10,
  },
  containerDefault: {
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 12,
  },
  containerFill: {
    alignSelf: "stretch",
    flex: 1,
  },
  description: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
  errorMessage: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  inputCompact: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    paddingVertical: 8,
  },
  inputDefault: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
  },
  leadingIcon: {
    flexShrink: 0,
  },
  maxLengthCounter: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontVariant: ["tabular-nums"],
  },
  trailingAccessory: {
    flexShrink: 0,
  },
  trailingSection: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  wrapper: {
    gap: 4,
  },
});
