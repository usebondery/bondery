"use client";

import { Checkbox, Chip, Stack, Text, ThemeIcon } from "@mantine/core";
import type { Icon as TablerIconType } from "@tabler/icons-react";
import { IconLink, IconLinkOff } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface IntegrationCardProps {
  connectedDescription: string;
  disabledDescription?: string;
  displayName: string;
  icon?: TablerIconType;
  iconColor?: string;
  iconNode?: ReactNode;
  isConnected: boolean;
  isDisabled: boolean;
  isLinkable?: boolean;
  onClick: () => void;
  provider: string;
  unconnectedDescription: string;
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
  isLinkable = true,
}: IntegrationCardProps) {
  const description = isDisabled
    ? (disabledDescription ?? connectedDescription)
    : isConnected
      ? connectedDescription
      : unconnectedDescription;

  const isChecked = isLinkable ? isConnected : false;

  return (
    <Checkbox.Card
      checked={isChecked}
      className="button-scale-effect"
      disabled={isDisabled}
      mod={{
        checked: isChecked,
        unchecked: !isChecked,
      }}
      onClick={onClick}
      p={"md"}
      style={{
        borderColor: isChecked ? "var(--mantine-color-green-filled)" : undefined,
        cursor: isDisabled ? "not-allowed" : "pointer",
        height: 160,
        opacity: isDisabled ? 0.6 : 1,
        position: "relative",
        width: 200,
      }}
    >
      {isLinkable ? (
        <Chip
          checked={isConnected}
          color={isConnected ? "green" : "red"}
          size="xs"
          style={{
            pointerEvents: "none",
            position: "absolute",
            right: 8,
            top: 8,
          }}
          styles={{
            label: {
              paddingLeft: 8,
              paddingRight: 8,
            },
          }}
          variant="light"
        >
          {isConnected ? <IconLink size={12} /> : <IconLinkOff size={12} />}
        </Chip>
      ) : null}

      <Stack align="center" gap="xs" h={"full"} justify="start" pt={"xs"}>
        <ThemeIcon color={iconColor} size={48} variant="filled">
          {iconNode ?? (Icon ? <Icon size={28} stroke={1.5} /> : null)}
        </ThemeIcon>
        <Text fw={600} size="sm">
          {displayName}
        </Text>
        <Text c="dimmed" size="xs" ta="center">
          {description}
        </Text>
      </Stack>
    </Checkbox.Card>
  );
}
