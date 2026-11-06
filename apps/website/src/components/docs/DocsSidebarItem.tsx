"use client";

import { hrefAssert } from "@bondery/mantine-next";
import type * as PageTree from "fumadocs-core/page-tree";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { DocsApiMethodBadge } from "@/components/docs/api/DocsApiMethodBadge";
import { DocsApiStatusBadge } from "@/components/docs/api/DocsApiStatusBadge";
import { docsApiMethod } from "@/lib/docs-api-tree";
import { docsErrorStatus } from "@/lib/docs-errors-tree";
import { isCurrentDocsPage } from "@/lib/docs-nav";
import classes from "./DocsSidebar.module.css";

type DocsSidebarItemProps = {
  activeRef: RefObject<HTMLAnchorElement | null>;
  node: PageTree.Item;
  pathname: string;
};

export function DocsSidebarItem({ activeRef, node, pathname }: DocsSidebarItemProps) {
  const current = isCurrentDocsPage(node.url, pathname);
  const method = docsApiMethod(node.url);
  const errorStatus = docsErrorStatus(node.url);

  const badge =
    method !== null ? (
      <DocsApiMethodBadge method={method} size="xs" />
    ) : errorStatus !== null ? (
      <DocsApiStatusBadge size="xs" status={errorStatus} />
    ) : undefined;

  return (
    <SidebarLink
      active={current}
      badge={badge}
      href={node.url}
      icon={node.icon}
      label={node.name}
      ref={current ? activeRef : undefined}
      {...(node.external ? { external: true } : {})}
    />
  );
}

/**
 * Icon slot, label, then the badge. The badge trails the title, so a method chip never
 * moves the title edge. The icon slot renders only when a row has an icon, so a row
 * without one starts its text at the row edge instead of leaving a gap.
 */
export function SidebarRow({
  badge,
  icon,
  label,
}: {
  badge?: ReactNode;
  icon?: ReactNode;
  label: ReactNode;
}) {
  return (
    <>
      {icon !== undefined ? <span className={classes.icon}>{icon}</span> : null}
      <span className={classes.label} title={typeof label === "string" ? label : undefined}>
        {label}
      </span>
      {badge !== undefined ? <span className={classes.badgeSlot}>{badge}</span> : null}
    </>
  );
}

type SidebarLinkProps = {
  active: boolean;
  badge?: ReactNode;
  external?: boolean;
  href: string;
  icon?: ReactNode;
  label: ReactNode;
  /** Row inside a folder container, which owns the hover and active surface. */
  plain?: boolean;
  ref?: RefObject<HTMLAnchorElement | null>;
};

export function SidebarLink({
  active,
  badge,
  external = false,
  href,
  icon,
  label,
  plain = false,
  ref,
}: SidebarLinkProps) {
  const className = plain ? classes.rowPlain : classes.row;
  const activeProps = active ? { "aria-current": "page" as const, "data-active": "true" } : {};
  const content = <SidebarRow badge={badge} icon={icon} label={label} />;

  if (external) {
    return (
      <a
        className={className}
        href={href}
        ref={ref}
        rel="noreferrer"
        target="_blank"
        {...activeProps}
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={hrefAssert(href)} ref={ref} {...activeProps}>
      {content}
    </Link>
  );
}
