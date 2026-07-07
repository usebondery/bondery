"use client";

import { Popover, Tooltip } from "@mantine/core";
import { ActionIconLink } from "@bondery/mantine-next";
import type { ReactNode } from "react";

export interface SocialPopoverButtonProps {
  field: string;
  isOpen: boolean;
  color: string;
  ariaLabel: string;
  tooltipLabel: string;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  target?: "_blank";
  icon: ReactNode;
  onHoverOpen: (field: string) => void;
  onLinkClick?: () => void;
  onScheduleClose: (field: string) => void;
  onCancelClose: () => void;
  children: ReactNode;
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
      opened={isOpen}
      position="bottom"
      withArrow
      arrowPosition="center"
      shadow="md"
      withinPortal
      zIndex={200}
      offset={8}
      middlewares={{ shift: true, flip: true }}
    >
      <Popover.Target>
        <span
          style={{ display: "inline-flex" }}
          onMouseEnter={() => {
            onCancelClose();
            onHoverOpen(field);
          }}
          onMouseLeave={() => onScheduleClose(field)}
          onFocusCapture={() => {
            onCancelClose();
            onHoverOpen(field);
          }}
          onBlurCapture={(event) => {
            const nextFocused = event.relatedTarget as Node | null;
            if (!event.currentTarget.contains(nextFocused)) {
              onScheduleClose(field);
            }
          }}
        >
          <Tooltip label={tooltipLabel} withArrow>
            <span
              style={{ display: "inline-flex" }}
              onClick={() => {
                if (canNavigate) {
                  onLinkClick?.();
                }
              }}
            >
              <ActionIconLink
                variant="light"
                color={color}
                size="lg"
                href={canNavigate ? href : undefined}
                target={target}
                ariaLabel={ariaLabel}
                disabled={disabled && !loading}
                loading={loading}
                icon={icon}
              />
            </span>
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
