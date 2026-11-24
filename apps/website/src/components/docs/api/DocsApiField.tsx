"use client";

import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { Badge, Box, Code, Collapse, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { type ReactNode, useId, useState } from "react";

/** Enums with more allowed values than this are not listed inline. */
const MAX_INLINE_ALLOWED_VALUES = 8;

function formatFieldValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type DocsApiFieldProps = {
  /** Pre-rendered child fields. Any children turn on the disclosure. */
  children?: ReactNode;
  defaultValue?: unknown;
  deprecated?: boolean;
  description?: ReactNode;
  enumValues?: unknown[];
  name: string;
  required?: boolean;
  typeLabel?: string | null;
};

/**
 * One row in a parameter or response list: name, type, default, allowed values,
 * description, and an optional disclosure for child fields.
 */
function DocsApiField({
  children,
  defaultValue,
  deprecated = false,
  description,
  enumValues,
  name,
  required = false,
  typeLabel,
}: DocsApiFieldProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const hasChildren = children !== undefined && children !== null;
  const allowed = enumValues ?? [];
  const hasDefault = defaultValue !== undefined;

  return (
    <Box>
      <Stack gap={4}>
        <Group gap="xs" wrap="wrap">
          <Code>{name}</Code>
          {typeLabel ? (
            <Text c="dimmed" component="span" ff="monospace" size="sm">
              {typeLabel}
            </Text>
          ) : null}
          {hasDefault ? (
            <Text c="dimmed" component="span" ff="monospace" size="sm">
              = {formatFieldValue(defaultValue)}
            </Text>
          ) : null}
          {allowed.length > 0 && allowed.length <= MAX_INLINE_ALLOWED_VALUES ? (
            <Text c="dimmed" component="span" size="sm">
              {docs.Api.OneOf}{" "}
              {allowed.map((value, index) => (
                <span key={formatFieldValue(value)}>
                  {index > 0 ? <Text component="span">, </Text> : null}
                  <Code>{formatFieldValue(value)}</Code>
                </span>
              ))}
            </Text>
          ) : null}
          {required ? (
            <Badge color="red" size="xs" variant="light">
              {docs.Api.Required}
            </Badge>
          ) : null}
          {deprecated ? (
            <Badge color="gray" size="xs" variant="light">
              {docs.Api.Deprecated}
            </Badge>
          ) : null}
        </Group>
        {description ? (
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        ) : null}
        {hasChildren ? (
          <UnstyledButton
            aria-controls={panelId}
            aria-expanded={open}
            c="var(--mantine-primary-color-filled)"
            onClick={() => {
              setOpen((current) => !current);
            }}
            type="button"
          >
            <Group gap={4} wrap="nowrap">
              <IconChevronRight
                size={14}
                style={{
                  transform: open ? "rotate(90deg)" : undefined,
                  transition: "transform 150ms",
                }}
              />
              <Text component="span" size="sm">
                {open ? docs.Api.HideChildParameters : docs.Api.ShowChildParameters}
              </Text>
            </Group>
          </UnstyledButton>
        ) : null}
      </Stack>
      {hasChildren ? (
        <Collapse expanded={open} id={panelId}>
          <Stack gap="md" pt="xs" style={{ paddingLeft: "var(--mantine-spacing-md)" }}>
            {children}
          </Stack>
        </Collapse>
      ) : null}
    </Box>
  );
}

export { DocsApiField, formatFieldValue };
