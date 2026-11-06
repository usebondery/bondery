"use client";

import { Code, Group, Stack, Title } from "@mantine/core";
import { useOperation } from "fumadocs-openapi/operation";
import { DocsApiMethodBadge } from "./DocsApiMethodBadge";

/** Operation header. `title` is the spec `summary` of the route. */
export function DocsApiOperationHeader({ showTitle = false }: { showTitle?: boolean }) {
  const { method, path, title } = useOperation();

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap">
        <DocsApiMethodBadge method={method} />
        <Code style={{ overflowWrap: "anywhere" }}>{path}</Code>
      </Group>
      {showTitle ? <Title order={2}>{title}</Title> : null}
    </Stack>
  );
}
