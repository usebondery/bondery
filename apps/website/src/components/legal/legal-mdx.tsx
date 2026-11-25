import { AnchorLink, hrefAssert } from "@bondery/mantine-next";
import { Box, Divider, List, ListItem, Text, Title } from "@mantine/core";
import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { MdxTable } from "@/components/mdx-table";

const EXTERNAL_HREF = /^https?:\/\//u;

function LegalLink({ href = "", children }: ComponentPropsWithoutRef<"a">) {
  return (
    <AnchorLink href={hrefAssert(href)} target={EXTERNAL_HREF.test(href) ? "_blank" : undefined}>
      {children}
    </AnchorLink>
  );
}

/** Indented block for postal addresses. Write each line of the address with a trailing `\`. */
function LegalBlock({ children }: { children: ReactNode }) {
  return (
    <Box mb="sm" pl="md">
      {children}
    </Box>
  );
}

/**
 * Mantine mapping for legal documents (`content/legal`). Headings take their anchor from the
 * `[#id]` suffix in the MDX source, and the table of contents reads `h2[id]`.
 */
export const legalMdxComponents: MDXComponents = {
  a: LegalLink,
  blockquote: ({ children }) => (
    <Box c="dimmed" fz="sm" mb="lg">
      {children}
    </Box>
  ),
  h2: ({ children, id }) => (
    <Title id={id} mb="md" order={2}>
      {children}
    </Title>
  ),
  h3: ({ children }) => (
    <Title mb="sm" mt="lg" order={3}>
      {children}
    </Title>
  ),
  hr: () => <Divider my="xl" />,
  LegalBlock,
  li: ({ children }) => <ListItem>{children}</ListItem>,
  p: ({ children }) => <Text mb="md">{children}</Text>,
  table: MdxTable,
  ul: ({ children }) => (
    <List listStyleType="disc" mb="lg" withPadding>
      {children}
    </List>
  ),
};
