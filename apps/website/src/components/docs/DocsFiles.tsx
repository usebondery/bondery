"use client";

import { Collapse, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconFile, IconFolder } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";

export function DocsFiles({ children }: { children: ReactNode }) {
  return <Stack gap={2}>{children}</Stack>;
}

type DocsFolderProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  name: string;
};

export function DocsFolder({ children, defaultOpen = false, name }: DocsFolderProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Stack gap={2}>
      <UnstyledButton
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Group gap={6} wrap="nowrap">
          <IconFolder size={16} />
          <Text size="sm">{name}</Text>
        </Group>
      </UnstyledButton>
      <Collapse expanded={open}>
        <Stack gap={2} pl="md">
          {children}
        </Stack>
      </Collapse>
    </Stack>
  );
}

export function DocsFile({ name }: { name: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <IconFile size={16} />
      <Text size="sm">{name}</Text>
    </Group>
  );
}
