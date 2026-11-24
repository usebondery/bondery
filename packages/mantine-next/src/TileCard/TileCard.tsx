"use client";

import {
  Box,
  type BoxProps,
  Button,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { cn } from "cn";
import type { ReactElement, ReactNode } from "react";

const CARD_CLASS = "tileCard";

/**
 * The trailing button.
 *
 * Either it does something, or it is a done state that explains itself. A done state has no
 * handler and carries a tooltip, so the reader always learns why the button is inert.
 */
type TileCardButton = {
  /** Text that names the click result, such as "Connect", "Unlink", or "Installed". */
  label: string;
  /** Leading glyph inside the button, for state such as connected. */
  leftSection?: ReactNode;
  variant?: "default" | "filled" | "light" | "outline" | "subtle";
} & (
  | {
      isDisabled?: false;
      /** Runs the click. */
      onClick: () => void;
      tooltip?: never;
    }
  | {
      isDisabled: true;
      /** Absent on purpose: the button states something the user cannot change from here. */
      onClick?: never;
      /** Explains the disabled state on hover. */
      tooltip: string;
    }
);

interface TileCardBaseProps extends Omit<BoxProps, "children" | "onClick"> {
  /** Small label under the title, such as "Socials" or "Chrome, Edge, Brave". */
  caption?: string;
  /** Real product logo. Sized by the card; pass a `BrandIcon`, a Tabler icon, or any node. */
  icon: ReactNode;
  /** Blocks the action and dims the card. */
  isDisabled?: boolean;
  /**
   * Anything pinned to the trailing edge, such as a status pill.
   *
   * It sits vertically centered against the title, never in a corner, so a short card and a tall
   * one read the same. When the variant also supplies an `action`, that button takes this slot and
   * `rightSection` is not used.
   */
  rightSection?: ReactNode;
  title: string;
  /**
   * Surface colour. `success` paints the border and the fill green, for a tile that reports a
   * finished state, so the state reads before any label does.
   */
  tone?: "default" | "success";
  tooltip?: string;
}

/** The success surface. The border and the fill both carry the state. */
const SUCCESS_TONE_STYLE = {
  backgroundColor: "var(--mantine-color-green-light)",
  borderColor: "var(--mantine-color-green-filled)",
} as const;

/**
 * The card that names one task, such as connecting an account.
 *
 * The action sits in a button on the trailing edge, level with the title, so the card stays short
 * and shows several per row. Omit `action` when there is nothing left to do.
 */
interface TileCardActionProps extends TileCardBaseProps {
  action?: TileCardButton;
  description?: never;
  /** Makes the whole surface the hit target, for a card whose body is the action. */
  onClick?: () => void;
  variant?: "action";
}

/**
 * The card that carries a description, such as an import that explains what it accepts.
 *
 * The whole card is one button and the action is a text link at the bottom right.
 */
interface TileCardLinkProps extends TileCardBaseProps {
  /** Trails the link text. Defaults to a right arrow. */
  actionIcon?: ReactNode;
  /** Text of the bottom-right link, such as "Import". */
  actionLabel: string;
  description?: string;
  onClick: () => void;
  variant: "link";
}

type TileCardProps = TileCardActionProps | TileCardLinkProps;

interface ActionButtonProps {
  action: TileCardButton | undefined;
  isDisabled: boolean;
}

/**
 * The trailing button.
 *
 * The button keeps its place in every state, so a card does not resize when its status changes.
 * A button the user cannot press now is disabled, and says why on hover.
 */
function ActionButton({ action, isDisabled }: ActionButtonProps): ReactElement | null {
  if (!action) {
    return null;
  }

  const isActionDisabled = isDisabled || action.isDisabled === true;
  const button = (
    <Button
      disabled={isActionDisabled}
      leftSection={action.leftSection}
      onClick={"onClick" in action ? action.onClick : undefined}
      size="xs"
      style={{ flexShrink: 0 }}
      variant={action.variant ?? "light"}
    >
      {action.label}
    </Button>
  );

  // A disabled button does not fire pointer events, so the tooltip sits on a wrapper.
  if (!isActionDisabled || !action.tooltip) {
    return button;
  }

  return (
    <Tooltip label={action.tooltip}>
      <Box style={{ display: "inline-flex", flexShrink: 0 }}>{button}</Box>
    </Tooltip>
  );
}

interface SurfaceProps extends Omit<BoxProps, "children" | "onClick"> {
  children: ReactNode;
  isDisabled?: boolean;
  onClick?: () => void;
  tooltip?: string;
}

/** The card shell. A button when the whole card acts, a plain box when only an inner button does. */
function Surface({
  children,
  className,
  isDisabled = false,
  onClick,
  tooltip,
  ...boxProps
}: SurfaceProps): ReactElement {
  const surface = onClick ? (
    <UnstyledButton
      aria-disabled={isDisabled ? true : undefined}
      className={cn(CARD_CLASS, "button-scale-effect", className)}
      data-disabled={isDisabled ? true : undefined}
      onClick={() => {
        if (!isDisabled) {
          onClick();
        }
      }}
      p="md"
      {...boxProps}
    >
      {children}
    </UnstyledButton>
  ) : (
    <Stack className={cn(CARD_CLASS, className)} gap={0} p="md" {...boxProps}>
      {children}
    </Stack>
  );

  return tooltip ? <Tooltip label={tooltip}>{surface}</Tooltip> : surface;
}

/**
 * An interactive card that presents one destination, app, or account.
 *
 * The `action` variant is a single row with its control on the trailing edge. The `link` variant
 * adds a description and makes the whole card the hit target.
 */
export function TileCard(props: TileCardProps): ReactElement {
  const {
    action,
    actionIcon = <IconArrowRight size={16} stroke={1.8} />,
    actionLabel,
    caption,
    className,
    description,
    icon,
    isDisabled = false,
    onClick,
    rightSection,
    style,
    title,
    tone = "default",
    tooltip,
    variant,
    ...boxProps
  } = props as TileCardBaseProps & {
    action?: TileCardButton;
    actionIcon?: ReactNode;
    actionLabel?: string;
    description?: string;
    onClick?: () => void;
    variant?: "action" | "link";
  };

  // Merge, so a caller's `style` refines the tone instead of replacing it.
  const surfaceStyle = tone === "success" ? { ...SUCCESS_TONE_STYLE, ...style } : style;

  // The button owns the slot when there is one, so the two never compete for the trailing edge.
  const trailing = action ? <ActionButton action={action} isDisabled={isDisabled} /> : rightSection;

  const header = (
    <Group align="center" gap="sm" justify="space-between" wrap="nowrap">
      <Group align="center" gap={10} style={{ flex: "1 1 auto", minWidth: 0 }} wrap="nowrap">
        {icon}
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={600} lineClamp={2} size="md" style={{ minWidth: 0 }}>
            {title}
          </Text>
          {caption ? (
            <Text c="dimmed" lineClamp={1} size="xs">
              {caption}
            </Text>
          ) : null}
        </Stack>
      </Group>

      {trailing ? <Box style={{ display: "flex", flexShrink: 0 }}>{trailing}</Box> : null}
    </Group>
  );

  if (variant === "link") {
    return (
      <Surface
        className={className}
        isDisabled={isDisabled}
        onClick={onClick}
        style={surfaceStyle}
        tooltip={tooltip}
        {...boxProps}
      >
        {header}
        {description ? (
          <Text c="dimmed" lineClamp={3} mt="sm" size="sm">
            {description}
          </Text>
        ) : null}
        <Group gap={4} justify="flex-end" mt="auto" pt="sm">
          <Text fw={600} size="sm">
            {actionLabel}
          </Text>
          {actionIcon}
        </Group>
      </Surface>
    );
  }

  return (
    <Surface
      className={className}
      isDisabled={isDisabled}
      onClick={onClick}
      style={surfaceStyle}
      tooltip={tooltip}
      {...boxProps}
    >
      {header}
    </Surface>
  );
}

export type {
  TileCardActionProps,
  TileCardBaseProps,
  TileCardButton,
  TileCardLinkProps,
  TileCardProps,
};
export { SUCCESS_TONE_STYLE };
