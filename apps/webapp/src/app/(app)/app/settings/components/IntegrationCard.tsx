"use client";

import { Checkbox, ThemeIcon, Chip, Stack, Text } from "@mantine/core";
import { IconLink, IconLinkOff } from "@tabler/icons-react";
import type { Icon as TablerIconType } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface IntegrationCardProps {
  provider: string;
  displayName: string;
  icon?: TablerIconType;
  iconNode?: ReactNode;
  iconColor?: string;
  isConnected: boolean;
  isDisabled: boolean;
  connectedDescription: string;
  unconnectedDescription: string;
  disabledDescription?: string;
  onClick: () => void;
}

export function IntegrationCard({
  displayName,
  icon: Icon,
  iconNode,
  iconColor,
  isConnected,
  isDisabled,
  connectedDescription,
  unconnectedDescription,
  disabledDescription,
  onClick,
}: IntegrationCardProps) {
  const description = isDisabled
    ? (disabledDescription ?? connectedDescription)
    : isConnected
      ? connectedDescription
      : unconnectedDescription;

  return (
    <Checkbox.Card
      className="button-scale-effect"
      checked={isConnected}
      p={"md"}
      onClick={onClick}
      style={{
        width: 200,
        height: 160,
        position: "relative",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.6 : 1,
        borderColor: isConnected ? "var(--mantine-color-green-filled)" : undefined,
      }}
      mod={{
        checked: isConnected,
        unchecked: !isConnected,
      }}
      disabled={isDisabled}
    >
      {/* Chip in top right */}
      <Chip
        checked={isConnected}
        color={isConnected ? "green" : "red"}
        variant="light"
        size="xs"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          pointerEvents: "none",
        }}
        styles={{
          label: {
            paddingLeft: 8,
            paddingRight: 8,
          },
        }}
      >
        {isConnected ? <IconLink size={12} /> : <IconLinkOff size={12} />}
      </Chip>

      <Stack gap="xs" align="center" justify="start" h={"full"} pt={"xs"}>
        <ThemeIcon size={48} variant="filled" color={iconColor}>
          {iconNode ?? (Icon ? <Icon size={28} stroke={1.5} /> : null)}
        </ThemeIcon>
        <Text size="sm" fw={600}>
          {displayName}
        </Text>
        <Text size="xs" ta="center" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Checkbox.Card>
  );
}
