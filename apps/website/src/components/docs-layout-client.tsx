"use client";

import { usePathname } from "fumadocs-core/framework";
import { DocsLayout, type DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import type { LayoutTab } from "fumadocs-ui/layouts/shared";
import type { ReactNode } from "react";
import { filterPageTreeForPathname, getActiveTabKey } from "@/lib/docs-tree";

export function DocsLayoutClient({
  tree,
  tabs,
  children,
  ...props
}: DocsLayoutProps & { tabs: LayoutTab[]; children: ReactNode }) {
  const pathname = usePathname();
  const tabKey = getActiveTabKey(pathname);
  const filteredTree = filterPageTreeForPathname(tree, pathname);

  return (
    <DocsLayout key={tabKey} tabs={tabs} tree={filteredTree} {...props}>
      {children}
    </DocsLayout>
  );
}
