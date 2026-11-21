"use client";

import { Box, Checkbox, Chip, Group, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import type { Icon as TablerIconType } from "@tabler/icons-react";
import { IconLink, IconLinkOff } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface IntegrationCardProps {
  badgeLabel?: string;
  displayName: string;
  icon?: TablerIconType;
  iconColor?: string;
  iconNode?: ReactNode;
  isConnected: boolean;
  isDisabled: boolean;
  isLinkable?: boolean;
  onClick: () => void;
  provider: string;
  tooltip?: string;
}

export function IntegrationCard({
  displayName,
  icon: Icon,
  iconNode,
  iconColor,
  isConnected,
  isDisabled,
  badgeLabel,
  onClick,
  isLinkable = true,
  tooltip,
}: IntegrationCardProps) {
  const isChecked = isConnected && (isLinkable === true || Boolean(badgeLabel));
  const showBadge = Boolean(badgeLabel) || isLinkable;

  return (
    <Tooltip disabled={!tooltip} label={tooltip}>
      <Box display="inline-block">
        <Checkbox.Card
          checked={isChecked}
          className="button-scale-effect"
          disabled={isDisabled}
          mod={{
            checked: isChecked,
            unchecked: !isChecked,
          }}
          onClick={onClick}
          pb="sm"
          pl="md"
          pr="md"
          pt={showBadge ? 36 : "md"}
          style={{
            borderColor: isChecked ? "var(--mantine-color-green-filled)" : undefined,
            cursor: isDisabled ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            height: 160,
            justifyContent: showBadge ? "flex-start" : "center",
            opacity: isDisabled ? 0.6 : 1,
            position: "relative",
            width: 200,
          }}
        >
          {showBadge ? (
            <Chip
              checked={isConnected}
              color={isConnected ? "green" : "red"}
              size="xs"
              style={{
                maxWidth: "calc(100% - 16px)",
                pointerEvents: "none",
                position: "absolute",
                right: 8,
                top: 8,
                zIndex: 1,
              }}
              styles={{
                label: {
                  paddingLeft: badgeLabel ? 6 : 8,
                  paddingRight: badgeLabel ? 6 : 8,
                },
              }}
              variant="light"
            >
              {badgeLabel ? (
                <Group gap={4} wrap="nowrap">
                  {isLinkable ? (
                    isConnected ? (
                      <IconLink size={12} />
                    ) : (
                      <IconLinkOff size={12} />
                    )
                  ) : null}
                  <Text component="span" inherit lineClamp={1} size="xs">
                    {badgeLabel}
                  </Text>
                </Group>
              ) : isConnected ? (
                <IconLink size={12} />
              ) : (
                <IconLinkOff size={12} />
              )}
            </Chip>
          ) : null}

          <Stack align="center" gap="sm" w="100%">
            <ThemeIcon color={iconColor} size="3rem" variant="filled">
              {iconNode ??
                (Icon ? <Icon stroke={1.5} style={{ height: "70%", width: "70%" }} /> : null)}
            </ThemeIcon>
            <Text fw={600} h="2.5em" lh={1.25} lineClamp={2} size="sm" ta="center" w="100%">
              {displayName}
            </Text>
          </Stack>
        </Checkbox.Card>
      </Box>
    </Tooltip>
  );
}
