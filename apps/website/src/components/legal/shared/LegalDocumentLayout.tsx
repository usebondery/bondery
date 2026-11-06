import { Box, Paper, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { PageToc } from "@/components/docs/PageToc";
import { SiteShell } from "@/components/site-shell";

const LEGAL_TOC_SELECTOR = "h2[id]";

interface LegalDocumentLayoutProps {
  children: ReactNode;
  lastUpdated: string;
  title: string;
}

/**
 * Legal document frame: the same columns as a docs page, inside a bordered card.
 * The rail reads `h2[id]` only, because legal sections are always second level.
 * Below `lg` the same list renders above the document.
 */
export function LegalDocumentLayout({ title, lastUpdated, children }: LegalDocumentLayoutProps) {
  return (
    <SiteShell right={<PageToc selector={LEGAL_TOC_SELECTOR} variant="rail" />}>
      <Paper className="legalDoc" p="xl" radius="md" withBorder>
        <Title mb="md" order={1}>
          {title}
        </Title>
        <Text c="dimmed" mb="xl" size="sm">
          Last Updated: {lastUpdated}
        </Text>

        <Box hiddenFrom="lg" mb="xl">
          <PageToc selector={LEGAL_TOC_SELECTOR} variant="inline" />
        </Box>

        {children}
      </Paper>
    </SiteShell>
  );
}
