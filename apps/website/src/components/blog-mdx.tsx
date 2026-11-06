import { Blockquote, Code, List, ListItem, Text, Title } from "@mantine/core";
import type { MDXComponents } from "mdx/types";
import { DocsMdxPre } from "@/components/docs/DocsMdxPre";
import { MdxTable } from "@/components/mdx-table";
import { RichAnchor } from "@/components/RichAnchor";

/** Mantine MDX primitives for blog posts (`content/blog`). Docs use `@/components/mdx` (Fumadocs). */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href, children }) => <RichAnchor href={href ?? ""}>{children}</RichAnchor>,
    blockquote: ({ children }) => <Blockquote mb="md">{children}</Blockquote>,
    code: ({ children }) => <Code>{children}</Code>,
    h1: ({ children }) => (
      <Title mb="md" order={1}>
        {children}
      </Title>
    ),
    h2: ({ children }) => (
      <Title mb="sm" mt="xl" order={2}>
        {children}
      </Title>
    ),
    h3: ({ children }) => (
      <Title mb="xs" mt="lg" order={3}>
        {children}
      </Title>
    ),
    h4: ({ children }) => (
      <Title mb="xs" mt="md" order={4}>
        {children}
      </Title>
    ),
    li: ({ children }) => <ListItem>{children}</ListItem>,
    ol: ({ children }) => (
      <List mb="md" size="lg" spacing="sm" type="ordered" withPadding>
        {children}
      </List>
    ),
    p: ({ children }) => (
      <Text component="p" lh={1.8} mb="md" size="lg">
        {children}
      </Text>
    ),
    pre: DocsMdxPre,
    ul: ({ children }) => (
      <List listStyleType="disc" mb="md" size="lg" spacing="sm" withPadding>
        {children}
      </List>
    ),
    ...components,
    table: MdxTable,
  };
}
