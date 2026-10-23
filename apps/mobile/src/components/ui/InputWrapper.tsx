import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./Text";

export type InputWrapperProps = {
  children: ReactNode;
  description?: string;
  errorMessage?: string;
  label?: string;
  statusMessage?: string;
};

const COMPACT_TEXT_STYLE = { includeFontPadding: false } as const;

/**
 * Shared chrome: label + description, child, then error or status below.
 * Header uses `gap-0` so the description sits on the label. Outer `gap-1`
 * is only between that header, the control, and the below message.
 */
export function InputWrapper({
  children,
  description,
  errorMessage,
  label,
  statusMessage,
}: InputWrapperProps) {
  const belowMessage = errorMessage || statusMessage;
  if (!label && !description && !belowMessage) {
    return children;
  }

  return (
    <View className="w-full gap-1">
      {label || description ? (
        <View className="gap-0">
          {label ? (
            <Text c="muted" className="leading-none" fw={600} size="sm" style={COMPACT_TEXT_STYLE}>
              {label}
            </Text>
          ) : null}
          {description ? (
            <Text c="muted" className="leading-tight" size="xs" style={COMPACT_TEXT_STYLE}>
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {errorMessage ? (
        <Text c="danger" className="leading-tight" size="xs" style={COMPACT_TEXT_STYLE}>
          {errorMessage}
        </Text>
      ) : statusMessage ? (
        <Text c="muted" className="leading-tight" size="xs" style={COMPACT_TEXT_STYLE}>
          {statusMessage}
        </Text>
      ) : null}
    </View>
  );
}
