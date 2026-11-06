"use client";

import { Box, Flex, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { DocsCopyMenu } from "./DocsCopyMenu";
import { type DocsFooterLink, DocsFooterNav } from "./DocsFooterNav";
import { DocsFrame } from "./DocsFrame";
import { DocsHashScroll } from "./DocsHashScroll";
import { DocsLastUpdated } from "./DocsLastUpdated";
import { DocsProse } from "./DocsProse";
import { type DocsTocItem, PageToc } from "./PageToc";

export interface DocsPageProps {
  children: ReactNode;
  description?: string;
  footer?: {
    next?: DocsFooterLink | null;
    previous?: DocsFooterLink | null;
  };
  full?: boolean;
  githubUrl?: string;
  /** Calendar date of the last substantive edit, from frontmatter. */
  lastUpdated?: string | null;
  markdownUrl?: string;
  pageUrl?: string;
  title: string;
  toc: DocsTocItem[];
}

/**
 * One docs page: head, prose, foot, and the section rail.
 *
 * The rail needs two or more headings, and is off when the page sets `full`.
 * Below `lg` the rail becomes a list above the prose.
 */
export function DocsPage({
  children,
  description,
  footer,
  full = false,
  githubUrl,
  lastUpdated,
  markdownUrl,
  pageUrl,
  title,
  toc,
}: DocsPageProps) {
  const showRail = !full && toc.length >= 2;

  return (
    <>
      <DocsHashScroll />
      <DocsFrame right={showRail ? <PageToc items={toc} variant="rail" /> : null}>
        <Stack className="docsPage" gap="md">
          <Flex
            align="flex-start"
            className="docsPageHead"
            gap="sm"
            justify="space-between"
            wrap="wrap"
          >
            <Title order={1} style={{ flex: "1 1 auto", minWidth: 0 }}>
              {title}
            </Title>
            {githubUrl && markdownUrl && pageUrl ? (
              <Box style={{ flex: "0 0 auto" }}>
                <DocsCopyMenu githubUrl={githubUrl} markdownUrl={markdownUrl} pageUrl={pageUrl} />
              </Box>
            ) : null}
          </Flex>
          {description ? (
            <Text c="dimmed" className="docsPageDescription">
              {description}
            </Text>
          ) : null}
          <Box hiddenFrom="lg">
            <PageToc items={toc} variant="inline" />
          </Box>
          <DocsProse>{children}</DocsProse>
          <Stack className="docsPageFoot" gap="md">
            {lastUpdated ? (
              <Text c="dimmed" size="sm">
                <DocsLastUpdated date={lastUpdated} />
              </Text>
            ) : null}
            <DocsFooterNav next={footer?.next} previous={footer?.previous} />
          </Stack>
        </Stack>
      </DocsFrame>
    </>
  );
}
