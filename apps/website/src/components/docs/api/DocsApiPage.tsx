"use client";

import { Text, Title } from "@mantine/core";
import { defaultShikiFactory } from "fumadocs-core/highlight/shiki/full";
import {
  type CodeBlockProps,
  createOpenAPIBaseRenderer,
  type OpenAPIComponents,
} from "fumadocs-openapi";
import type { ComponentProps } from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsApiLayout } from "./DocsApiLayout";
import { DocsApiOperation } from "./DocsApiOperation";
import { DocsApiSchema } from "./DocsApiSchema";

function DocsApiSchemaUI({ client, root }: ComponentProps<OpenAPIComponents["SchemaUI"]>) {
  return <DocsApiSchema name={client.name} schema={root} />;
}

function DocsApiMarkdown({ md }: { md: string }) {
  return <Text>{md}</Text>;
}

/** Mantine `Title` supports orders 1 to this value, like HTML `h1` to `h6`. */
const MAX_HEADING_ORDER = 6;

function DocsApiHeading({
  children,
  depth,
  id,
}: ComponentProps<"h1"> & {
  depth: number;
  id: string;
}) {
  // Title order is 1-6. Heading depth from the renderer is a number.
  const order = Math.min(Math.max(Math.trunc(depth), 1), MAX_HEADING_ORDER) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;

  return (
    <Title id={id} order={order}>
      {children}
    </Title>
  );
}

function DocsApiCodeBlock({ code, lang }: CodeBlockProps) {
  return <DocsCodeBlock code={code} language={lang} />;
}

export const DocsOpenAPIPage = createOpenAPIBaseRenderer({
  components: {
    CodeBlock: DocsApiCodeBlock,
    Heading: DocsApiHeading,
    Layout: DocsApiLayout,
    Markdown: DocsApiMarkdown,
    Operation: DocsApiOperation,
    SchemaUI: DocsApiSchemaUI,
  },
  shiki: defaultShikiFactory,
});

export function DocsApiPage(props: ComponentProps<typeof DocsOpenAPIPage>) {
  return <DocsOpenAPIPage {...props} />;
}
