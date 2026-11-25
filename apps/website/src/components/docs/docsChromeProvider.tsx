"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext } from "react";
import { filterPageTreeForPathname } from "@/lib/docs-tree";
import { DocsMobileNav } from "./DocsMobileNav";
import { DocsSidebar } from "./DocsSidebar";
import type { DocsTab } from "./DocsTabs";

interface DocsChrome {
  /** Section rail control, for use below `lg`. */
  mobileNav: ReactNode;
  /** Filled sidebar, for the left column. */
  sidebar: ReactNode;
}

const DocsChromeContext = createContext<DocsChrome | null>(null);

/**
 * Docs navigation for every page under the docs layout.
 *
 * The layout knows the page tree. The page knows its own table of contents. This
 * context carries the sidebar up from the layout so `DocsPage` can place all three
 * columns in one `SiteShell`.
 */
export function DocsChromeProvider({
  children,
  tabs,
  tree,
}: {
  children: ReactNode;
  tabs: DocsTab[];
  tree: PageTree.Root;
}) {
  const pathname = usePathname();
  const visibleTree = filterPageTreeForPathname(tree, pathname);

  const value: DocsChrome = {
    mobileNav: <DocsMobileNav pathname={pathname} tabs={tabs} tree={visibleTree} />,
    sidebar: <DocsSidebar pathname={pathname} tabs={tabs} tree={visibleTree} />,
  };

  return <DocsChromeContext.Provider value={value}>{children}</DocsChromeContext.Provider>;
}

/** `null` outside the docs layout, so a shared component can tell where it renders. */
export function useDocsChrome(): DocsChrome | null {
  return useContext(DocsChromeContext);
}
