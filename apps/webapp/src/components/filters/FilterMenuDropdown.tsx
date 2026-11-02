"use client";

import { Button, Group, Popover, Stack } from "@mantine/core";
import type { ReactNode } from "react";

interface FilterMenuDropdownProps {
  children: ReactNode;
  onReset: () => void;
  resetDisabled?: boolean;
  resetLabel: string;
}

/** Popover body for a filter menu. Reset sits above the filter fields. */
export function FilterMenuDropdown({
  children,
  onReset,
  resetDisabled = false,
  resetLabel,
}: FilterMenuDropdownProps) {
  return (
    <Popover.Dropdown w="max-content">
      <Stack gap="sm">
        <Group justify="flex-end">
          <Button
            color="gray"
            disabled={resetDisabled}
            onClick={onReset}
            size="compact-sm"
            variant="subtle"
          >
            {resetLabel}
          </Button>
        </Group>
        {children}
      </Stack>
    </Popover.Dropdown>
  );
}
