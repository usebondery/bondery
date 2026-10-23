import { IconChevronRight, IconExternalLink } from "@tabler/icons-react-native";
import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useAppNavigation } from "../../lib/navigation/useAppNavigation";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { Divider } from "./Divider";
import { joinClassNames } from "./joinClassNames";
import { Text } from "./Text";
import { usePressSqueeze } from "./usePressSqueeze";

type NavLinkBaseProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  className?: string;
  color?: "danger" | "primary";
  description?: string;
  disabled?: boolean;
  /** Replaces the chevron with an external-link icon. */
  external?: boolean;
  label: string;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  withChevron?: boolean;
  withDivider?: boolean;
};

export type NavLinkWithHrefProps = NavLinkBaseProps & {
  href: Href;
  navigationMode?: "navigate" | "push";
  onPress?: never;
};

export type NavLinkWithPressProps = NavLinkBaseProps & {
  href?: never;
  navigationMode?: never;
  onPress: () => void;
};

export type NavLinkProps = NavLinkWithHrefProps | NavLinkWithPressProps;

function isNavLinkWithHref(props: NavLinkProps): props is NavLinkWithHrefProps {
  return "href" in props && props.href !== undefined;
}

export function NavLink(props: NavLinkProps) {
  const {
    accessibilityHint,
    accessibilityLabel,
    className,
    color = "primary",
    description,
    disabled = false,
    external = false,
    label,
    leftSection,
    rightSection,
    withChevron = true,
    withDivider = true,
  } = props;

  const colors = useMobileThemeColors();
  const { isNavigationLocked, navigateTo, push } = useAppNavigation();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const [isPressed, setIsPressed] = useState(false);
  const resolvedLabel = accessibilityLabel ?? label;
  const showChevron = withChevron && !external;

  const hasHref = isNavLinkWithHref(props);
  const isDisabled = disabled || (hasHref && isNavigationLocked);

  const handlePress = () => {
    if (isDisabled) {
      return;
    }

    if (hasHref) {
      const href = props.href;
      const mode = props.navigationMode ?? "push";
      if (mode === "navigate") {
        navigateTo(href);
      } else {
        push(href);
      }
      return;
    }

    props.onPress();
  };

  return (
    <>
      <Animated.View style={squeezeStyle}>
        <Pressable
          accessibilityHint={accessibilityHint}
          accessibilityLabel={resolvedLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          className={joinClassNames(
            "min-h-[52px] flex-row items-center gap-2.5 px-3.5",
            isDisabled ? "opacity-45" : undefined,
            className,
          )}
          data-disabled={isDisabled ? "true" : undefined}
          data-pressed={isPressed ? "true" : undefined}
          disabled={isDisabled}
          onPress={handlePress}
          onPressIn={() => {
            if (isDisabled) {
              return;
            }
            setIsPressed(true);
            pressIn();
          }}
          onPressOut={() => {
            setIsPressed(false);
            pressOut();
          }}
          style={({ pressed }) => ({
            backgroundColor: pressed && !isDisabled ? colors.surfacePressed : colors.surface,
          })}
        >
          {leftSection ? (
            <View className="w-7 items-center justify-center">{leftSection}</View>
          ) : null}

          <View className="min-w-0 flex-1 py-3">
            <Text c={color === "danger" ? "danger" : "primary"} fw={500} size="lg">
              {label}
            </Text>
            {description ? (
              <Text c="muted" size="sm">
                {description}
              </Text>
            ) : null}
          </View>

          {rightSection ? (
            <View className="shrink-0">
              {typeof rightSection === "string" ? (
                <Text c="muted" size="sm">
                  {rightSection}
                </Text>
              ) : (
                rightSection
              )}
            </View>
          ) : null}

          {external ? (
            <IconExternalLink size={16} stroke={colors.iconSecondary} />
          ) : showChevron ? (
            <IconChevronRight size={18} stroke={colors.iconSecondary} />
          ) : null}
        </Pressable>
      </Animated.View>
      {withDivider ? <Divider /> : null}
    </>
  );
}
