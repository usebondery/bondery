"use client";

import { Combobox, Group, Text } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

export function selectedComboboxOptionStyle(isSelected: boolean): CSSProperties | undefined {
  if (!isSelected) {
    return undefined;
  }

  return {
    backgroundColor: "var(--mantine-color-branding-primary-filled)",
    color: "white",
  };
}

export type SearchableComboboxTextVariant = "default" | "selected";

export type SearchableComboboxItemTextProps = {
  main: ReactNode;
  supporting?: ReactNode;
  truncate?: boolean;
  variant?: SearchableComboboxTextVariant;
};

export function SearchableComboboxItemText({
  main,
  supporting,
  truncate = false,
  variant = "default",
}: SearchableComboboxItemTextProps) {
  const hasSupporting = supporting !== undefined && supporting !== null && supporting !== "";

  return (
    <Text
      component="span"
      fw={400}
      size="sm"
      style={truncate ? { flex: 1, minWidth: 0, overflow: "hidden" } : undefined}
      truncate={truncate}
    >
      {main}
      {hasSupporting ? (
        <>
          {" "}
          <Text
            c={variant === "selected" ? undefined : "dimmed"}
            component="span"
            fw={400}
            opacity={variant === "selected" ? 0.85 : undefined}
            size="xs"
            style={variant === "selected" ? { color: "inherit" } : undefined}
          >
            ({supporting})
          </Text>
        </>
      ) : null}
    </Text>
  );
}

export type SearchableComboboxPickerItemProps = {
  flag?: string;
  isSelected?: boolean;
  main: ReactNode;
  supporting?: ReactNode;
  trailing?: ReactNode;
  value: string;
};

export function SearchableComboboxPickerOption({
  flag,
  isSelected = false,
  main,
  supporting,
  trailing,
  value,
}: SearchableComboboxPickerItemProps) {
  return (
    <Combobox.Option style={selectedComboboxOptionStyle(isSelected)} value={value}>
      <Group gap="xs" justify="space-between" w="100%" wrap="nowrap">
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
          {flag ? <span className={`fi fi-${flag}`} style={{ flexShrink: 0, width: 20 }} /> : null}
          <SearchableComboboxItemText
            main={main}
            supporting={supporting}
            truncate
            variant={isSelected ? "selected" : "default"}
          />
        </Group>
        {trailing ? (
          <Text
            c={isSelected ? undefined : "dimmed"}
            component="span"
            fw={400}
            opacity={isSelected ? 0.85 : undefined}
            size="xs"
            style={
              isSelected
                ? ({ color: "inherit", flexShrink: 0 } as CSSProperties)
                : { flexShrink: 0 }
            }
          >
            {trailing}
          </Text>
        ) : null}
      </Group>
    </Combobox.Option>
  );
}

export type SearchableComboboxTargetItemProps = {
  flag?: string;
  main: ReactNode;
  supporting?: ReactNode;
  trailing?: ReactNode;
};

export function SearchableComboboxTargetItem({
  flag,
  main,
  supporting,
  trailing,
}: SearchableComboboxTargetItemProps) {
  return (
    <Group
      gap="xs"
      justify="space-between"
      style={{ flex: 1, minWidth: 0, overflow: "hidden" }}
      wrap="nowrap"
    >
      <Group gap="xs" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
        {flag ? <span className={`fi fi-${flag}`} style={{ flexShrink: 0 }} /> : null}
        <SearchableComboboxItemText
          main={main}
          supporting={supporting}
          truncate
          variant="default"
        />
      </Group>
      {trailing ? (
        <Text c="dimmed" component="span" fw={400} size="xs" style={{ flexShrink: 0 }}>
          {trailing}
        </Text>
      ) : null}
    </Group>
  );
}
