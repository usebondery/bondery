import { LinkCard } from "@bondery/mantine-next";
import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import { folderUrl } from "@/lib/docs-folders";
import { source } from "@/lib/source";

function nodeTitle(name: ReactNode): string {
  return typeof name === "string" ? name : "Page";
}

function pageDescription(url: string): string | undefined {
  const slug = url.replace(/^\/docs\/?/, "");
  if (slug.length === 0) {
    return undefined;
  }

  const description = source.getPage(slug.split("/"))?.data.description;
  return typeof description === "string" ? description : undefined;
}

type Tile = {
  description?: string;
  href: string;
  icon?: ReactNode;
  title: string;
};

function tilesFor(folder: PageTree.Folder): Tile[] {
  const tiles: Tile[] = [];

  for (const child of folder.children) {
    if (child.type === "page") {
      const description = pageDescription(child.url);
      tiles.push({
        href: child.url,
        icon: child.icon,
        title: nodeTitle(child.name),
        ...(description ? { description } : {}),
      });
      continue;
    }

    if (child.type === "folder") {
      const href = folderUrl(child);
      if (!href) {
        continue;
      }
      tiles.push({
        href,
        icon: child.icon,
        title: nodeTitle(child.name),
      });
    }
  }

  return tiles;
}

/** Landing for a docs folder that has no index page. Each child is one tile. */
export function DocsFolderIndex({ folder }: { folder: PageTree.Folder }) {
  const tiles = tilesFor(folder);

  return (
    <div className="docsGrid">
      {tiles.map((tile) => (
        <LinkCard
          href={tile.href}
          icon={tile.icon}
          key={tile.href}
          title={tile.title}
          {...(tile.description ? { description: tile.description } : {})}
        />
      ))}
    </div>
  );
}
