"use client";

import { Burger, Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type * as PageTree from "fumadocs-core/page-tree";
import { useEffect } from "react";
import { DocsSidebar } from "./DocsSidebar";
import type { DocsTab } from "./DocsTabs";

type DocsMobileNavProps = {
  pathname: string;
  tabs: DocsTab[];
  tree: PageTree.Root;
};

export function DocsMobileNav({ pathname, tabs, tree }: DocsMobileNavProps) {
  const [opened, { close, toggle }] = useDisclosure(false);

  useEffect(() => {
    if (pathname.length === 0) {
      return;
    }
    close();
  }, [close, pathname]);

  return (
    <>
      <Burger
        aria-label={opened ? "Close documentation menu" : "Open documentation menu"}
        onClick={toggle}
        opened={opened}
      />
      <Drawer.Root onClose={close} opened={opened} position="right" size={320}>
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Documentation</Drawer.Title>
            <Drawer.CloseButton />
          </Drawer.Header>
          <Drawer.Body>
            {opened ? (
              <DocsSidebar framed={false} pathname={pathname} tabs={tabs} tree={tree} />
            ) : null}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </>
  );
}
