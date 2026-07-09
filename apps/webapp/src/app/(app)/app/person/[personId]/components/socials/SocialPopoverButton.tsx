"use client";

import { ActionIconLink } from "@bondery/mantine-next";
import { Popover, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

export interface SocialPopoverButtonProps {
  ariaLabel: string;
  children: ReactNode;
  color: string;
  disabled?: boolean;
  field: string;
  href?: string;
  icon: ReactNode;
  isOpen: boolean;
  loading?: boolean;
  onCancelClose: () => void;
  onHoverOpen: (field: string) => void;
  onLinkClick?: () => void;
  onScheduleClose: (field: string) => void;
  target?: "_blank";
  tooltipLabel: string;
}

export function SocialPopoverButton({
  field,
  isOpen,
  color,
  ariaLabel,
  tooltipLabel,
  disabled,
  loading = false,
  href,
  target,
  icon,
  onHoverOpen,
  onLinkClick,
  onScheduleClose,
  onCancelClose,
  children,
}: SocialPopoverButtonProps) {
  const canNavigate = Boolean(href) && !loading;

  return (
    <Popover
      arrowPosition="center"
      middlewares={{ flip: true, shift: true }}
      offset={8}
      opened={isOpen}
      position="bottom"
      shadow="md"
      withArrow
      withinPortal
      zIndex={200}
    >
      <Popover.Target>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hover/focus wrapper for Mantine Popover.Target */}
        <span
          onBlurCapture={(event) => {
            const nextFocused = event.relatedTarget as Node | null;
            if (!event.currentTarget.contains(nextFocused)) {
              onScheduleClose(field);
            }
          }}
          onFocusCapture={() => {
            onCancelClose();
            onHoverOpen(field);
          }}
          onMouseEnter={() => {
            onCancelClose();
            onHoverOpen(field);
          }}
          onMouseLeave={() => onScheduleClose(field)}
          style={{ display: "inline-flex" }}
        >
          <Tooltip label={tooltipLabel} withArrow>
            <ActionIconLink
              ariaLabel={ariaLabel}
              color={color}
              disabled={disabled && !loading}
              href={canNavigate ? href : undefined}
              icon={icon}
              loading={loading}
              onClick={() => {
                if (canNavigate) {
                  onLinkClick?.();
                }
              }}
              size="lg"
              target={target}
              variant="light"
            />
          </Tooltip>
        </span>
      </Popover.Target>

      <Popover.Dropdown
        onMouseEnter={onCancelClose}
        onMouseLeave={() => onScheduleClose(field)}
        p="sm"
      >
        {children}
      </Popover.Dropdown>
    </Popover>
  );
}
