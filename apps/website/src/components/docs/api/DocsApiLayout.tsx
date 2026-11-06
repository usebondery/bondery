import { Stack } from "@mantine/core";
import type { PageLayoutProps } from "fumadocs-openapi";
import { Fragment } from "react";

export function DocsApiLayout({ operations, webhooks }: PageLayoutProps) {
  return (
    <Stack gap={48}>
      {operations?.map((operation) => (
        <Fragment key={`${operation.item.method} ${operation.item.path}`}>
          {operation.children}
        </Fragment>
      ))}
      {webhooks?.map((webhook) => (
        <Fragment key={`${webhook.item.method} ${webhook.item.name}`}>{webhook.children}</Fragment>
      ))}
    </Stack>
  );
}
