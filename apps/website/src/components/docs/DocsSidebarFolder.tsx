"use client";

import { Collapse, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import type * as PageTree from "fumadocs-core/page-tree";
import { type ReactNode, type RefObject, useId, useState } from "react";
import { folderOwnUrl, folderUrl } from "@/lib/docs-folders";
import { docsPageContainsPath, isCurrentDocsPage } from "@/lib/docs-nav";
import classes from "./DocsSidebar.module.css";
import { SidebarLink, SidebarRow } from "./DocsSidebarItem";

type DocsSidebarFolderProps = {
  activeRef: RefObject<HTMLAnchorElement | null>;
  children: ReactNode;
  node: PageTree.Folder;
  /** Own page of the enclosing folder. A group that resolves back to it gets no link. */
  parentUrl?: string | null;
  pathname: string;
};

function folderContainsActive(folder: PageTree.Folder, pathname: string): boolean {
  // Only the folder's own page can match by prefix. A label-only group has no page, so
  // its own URL is `null` and the child recursion below decides.
  const url = folderOwnUrl(folder);
  if (url && docsPageContainsPath(url, pathname)) {
    return true;
  }

  for (const child of folder.children) {
    if (child.type === "page" && docsPageContainsPath(child.url, pathname)) {
      return true;
    }
    if (child.type === "folder" && folderContainsActive(child, pathname)) {
      return true;
    }
  }

  return false;
}

export function DocsSidebarFolder({
  activeRef,
  children,
  node,
  parentUrl,
  pathname,
}: DocsSidebarFolderProps) {
  const panelId = useId();
  const canCollapse = node.collapsible !== false && node.children.length > 0;
  const containsActive = folderContainsActive(node, pathname);
  const [opened, setOpened] = useState(() => node.defaultOpen === true || containsActive);
  const [openPathname, setOpenPathname] = useState(pathname);

  if (openPathname !== pathname) {
    setOpenPathname(pathname);
    if (containsActive) {
      setOpened(true);
    }
  }

  const expanded = canCollapse ? opened : true;
  // `folderUrl` returns `null` for a label-only group such as an error-type heading,
  // so that group renders as a label with a toggle and no link.
  const url = folderUrl(node, parentUrl);
  const current = url ? isCurrentDocsPage(url, pathname) : false;
  const label = typeof node.name === "string" ? node.name : "section";

  return (
    <div>
      <div
        className={classes.folder}
        {...(current ? { "data-active": "true" } : {})}
        {...(containsActive ? { "data-ancestor": "true" } : {})}
      >
        {url ? (
          <SidebarLink
            active={current}
            href={url}
            icon={node.icon}
            label={node.name}
            plain
            ref={current ? activeRef : undefined}
          />
        ) : (
          <span className={classes.rowPlain}>
            <SidebarRow icon={node.icon} label={node.name} />
          </span>
        )}
        {canCollapse ? (
          <UnstyledButton
            aria-controls={panelId}
            aria-expanded={opened}
            aria-label={opened ? `Collapse ${label}` : `Expand ${label}`}
            className={classes.toggle}
            onClick={() => setOpened((open) => !open)}
            type="button"
          >
            <IconChevronRight
              className={classes.chevron}
              data-expanded={opened ? "true" : undefined}
              size={13}
              stroke={1.8}
            />
          </UnstyledButton>
        ) : null}
      </div>
      <Collapse expanded={expanded} id={panelId}>
        <div className={classes.nest}>{children}</div>
      </Collapse>
    </div>
  );
}
