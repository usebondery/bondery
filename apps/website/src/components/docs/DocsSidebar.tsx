"use client";

import { SearchTrigger } from "@bondery/mantine-next";
import { Box, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import type * as PageTree from "fumadocs-core/page-tree";
import { type RefObject, useEffect, useRef } from "react";
import { folderOwnUrl } from "@/lib/docs-folders";
import classes from "./DocsSidebar.module.css";
import { DocsSidebarFolder } from "./DocsSidebarFolder";
import { DocsSidebarItem } from "./DocsSidebarItem";
import { type DocsTab, DocsTabs } from "./DocsTabs";

type DocsSidebarProps = {
  /** Rounded card that stays under the header. The mobile drawer turns this off. */
  framed?: boolean;
  pathname: string;
  scrollActiveIntoView?: boolean;
  tabs: DocsTab[];
  tree: PageTree.Root;
};

function sidebarNodeKey(node: PageTree.Node, index: number): string {
  if (node.$id) {
    return node.$id;
  }
  if (node.type === "page") {
    return node.url;
  }
  if (node.type === "folder") {
    return node.index?.url ?? node.$ref?.folder ?? `folder-${index}`;
  }
  return `separator-${index}`;
}

function DocsSidebarNodes({
  activeRef,
  nodes,
  parentUrl,
  pathname,
}: {
  activeRef: RefObject<HTMLAnchorElement | null>;
  nodes: PageTree.Node[];
  /** Own page of the enclosing folder, so a nested label-only group gets no link. */
  parentUrl?: string | null;
  pathname: string;
}) {
  return nodes.map((node, index) => {
    const key = sidebarNodeKey(node, index);

    if (node.type === "separator") {
      if (!node.name) {
        return null;
      }
      return (
        <Text className={classes.groupLabel} component="p" key={key}>
          {node.name}
        </Text>
      );
    }

    if (node.type === "folder") {
      const ownUrl = folderOwnUrl(node);
      return (
        <DocsSidebarFolder
          activeRef={activeRef}
          key={key}
          node={node}
          parentUrl={parentUrl}
          pathname={pathname}
        >
          <DocsSidebarNodes
            activeRef={activeRef}
            nodes={node.children}
            parentUrl={ownUrl ?? parentUrl}
            pathname={pathname}
          />
        </DocsSidebarFolder>
      );
    }

    return <DocsSidebarItem activeRef={activeRef} key={key} node={node} pathname={pathname} />;
  });
}

export function DocsSidebar({
  framed = true,
  pathname,
  scrollActiveIntoView = true,
  tabs,
  tree,
}: DocsSidebarProps) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const node = activeRef.current;
    if (!scrollActiveIntoView || pathname.length === 0 || !node) {
      return;
    }
    if (node.getClientRects().length === 0) {
      return;
    }
    node.scrollIntoView({ block: "nearest" });
  }, [pathname, scrollActiveIntoView]);

  return (
    <Paper
      p="xs"
      radius="lg"
      shadow="md"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--mantine-spacing-xs)",
        height: framed
          ? "calc(100dvh - var(--site-header-sticky-bottom) - var(--mantine-spacing-xl))"
          : undefined,
        maxHeight: framed
          ? "calc(100dvh - var(--site-header-sticky-bottom) - var(--mantine-spacing-xl))"
          : "calc(100dvh - 4rem)",
        overflow: "hidden",
        position: framed ? "sticky" : undefined,
        top: framed
          ? "calc(var(--site-header-sticky-bottom) + var(--mantine-spacing-xs))"
          : undefined,
      }}
      withBorder
    >
      <Stack gap="xs">
        <SearchTrigger
          height={36}
          label="Search"
          onClick={() => spotlight.open()}
          shortcut={["mod", "k"]}
        />
        <DocsTabs pathname={pathname} tabs={tabs} />
      </Stack>
      <ScrollArea
        className={classes.scroll}
        flex="1 1 auto"
        mih={0}
        offsetScrollbars={false}
        type="hover"
        viewportProps={{ style: { height: "100%" } }}
      >
        <Box aria-label="Documentation pages" className={classes.nav} component="nav">
          <DocsSidebarNodes activeRef={activeRef} nodes={tree.children} pathname={pathname} />
        </Box>
      </ScrollArea>
    </Paper>
  );
}
