"use client";

import { Box } from "@mantine/core";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";
import { useDocsChrome } from "./DocsChrome";

interface DocsFrameProps {
  children: ReactNode;
  /** Section rail. Pass the table of contents, or nothing on a page with none. */
  right?: ReactNode;
}

/**
 * Docs page frame. The left column and the mobile navigation come from `DocsChrome`,
 * so every page under `/docs` gets the sidebar from one call to `SiteShell`.
 */
export function DocsFrame({ children, right }: DocsFrameProps) {
  const chrome = useDocsChrome();

  return (
    <SiteShell left={chrome?.sidebar} leftWidth="19rem" right={right}>
      {chrome ? (
        <Box hiddenFrom="lg" mb="md">
          {chrome.mobileNav}
        </Box>
      ) : null}
      {children}
    </SiteShell>
  );
}
