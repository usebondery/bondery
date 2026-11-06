import "../../docs.css";
import "../../marketing.css";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { DocsChromeProvider } from "@/components/docs/DocsChrome";
import { getDocsLayoutTabs } from "@/lib/docs-tabs";
import { getFilteredPageTree } from "@/lib/source";

const DocsSearchSpotlight = dynamic(() =>
  import("@/components/docs/DocsSearchSpotlight").then((mod) => mod.DocsSearchSpotlight),
);

/**
 * Docs pages render inside the marketing shell from `(marketing)/layout.tsx`.
 * This layout only adds what the docs tree needs: navigation context and search.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsChromeProvider tabs={getDocsLayoutTabs()} tree={getFilteredPageTree()}>
      {children}
      <DocsSearchSpotlight />
    </DocsChromeProvider>
  );
}
