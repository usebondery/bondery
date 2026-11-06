import { LinkCard } from "@bondery/mantine-next";
import type { ReactNode } from "react";
import { findDocsIcon } from "@/lib/docs-folders";
import { getFilteredPageTree } from "@/lib/source";

type DocsCardsProps = {
  children: ReactNode;
};

type DocsCardProps = {
  children?: ReactNode;
  description?: string;
  href: string;
  icon?: ReactNode;
  title: string;
};

export function DocsCards({ children }: DocsCardsProps) {
  return <div className="docsGrid">{children}</div>;
}

/** One link card. The whole card opens `href`. */
export function DocsCard({ children, description, href, icon, title }: DocsCardProps) {
  const pageIcon = icon ?? findDocsIcon(getFilteredPageTree().children, href);
  const external = href.startsWith("http://") || href.startsWith("https://");
  const body = children ?? description;
  return (
    <LinkCard
      description={body}
      external={external}
      href={href}
      title={title}
      {...(pageIcon ? { icon: pageIcon } : {})}
    />
  );
}
