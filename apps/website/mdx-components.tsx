import type { MDXComponents } from "mdx/types";
import { Anchor, Code, Title, Text, Blockquote, List, ListItem } from "@mantine/core";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <Title order={1} mb="md">
        {children}
      </Title>
    ),
    h2: ({ children }) => (
      <Title order={2} mb="sm" mt="xl">
        {children}
      </Title>
    ),
    h3: ({ children }) => (
      <Title order={3} mb="xs" mt="lg">
        {children}
      </Title>
    ),
    p: ({ children }) => (
      <Text mb="md" size="lg" lh={1.8}>
        {children}
      </Text>
    ),
    a: ({ href, children }) => (
      <Anchor href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </Anchor>
    ),
    code: ({ children }) => <Code>{children}</Code>,
    blockquote: ({ children }) => <Blockquote mb="md">{children}</Blockquote>,
    ul: ({ children }) => (
      <List spacing="sm" size="lg" mb="md" withPadding listStyleType="disc">
        {children}
      </List>
    ),
    ol: ({ children }) => (
      <List type="ordered" spacing="sm" size="lg" mb="md" withPadding>
        {children}
      </List>
    ),
    li: ({ children }) => <ListItem>{children}</ListItem>,
    ...components,
  };
}
