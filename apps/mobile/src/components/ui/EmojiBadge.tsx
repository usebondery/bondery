import { Text } from "./Text";
import { ThemeIcon } from "./ThemeIcon";
import type { ThemeIconSize } from "./themeIconTokens";

export type EmojiBadgeProps = {
  backgroundColor: string;
  emoji: string;
  size?: ThemeIconSize;
};

/** Emoji on a colored circular badge; shares dimensions with `ThemeIcon`. */
export function EmojiBadge({ backgroundColor, emoji, size = "sm" }: EmojiBadgeProps) {
  return (
    <ThemeIcon color={backgroundColor} shape="circle" size={size} variant="custom">
      <Text className="text-base leading-5" size={null}>
        {emoji}
      </Text>
    </ThemeIcon>
  );
}
