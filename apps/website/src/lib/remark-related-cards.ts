import path from "node:path";
import { GITHUB_BLOB_BASE } from "@bondery/helpers";
import type { Link, List, ListItem, Parent, Root, RootContent } from "mdast";

type MdxAttribute = {
  name: string;
  type: "mdxJsxAttribute";
  value: string;
};

type MdxElement = {
  attributes: MdxAttribute[];
  children: RootContent[];
  name: string;
  type: "mdxJsxFlowElement";
};

function plainText(node: Parent | Link | ListItem | undefined): string {
  if (!node) {
    return "";
  }
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }
  if (!("children" in node)) {
    return "";
  }
  return node.children.map((child) => plainText(child as Parent)).join("");
}

function isRelatedHeading(node: RootContent): boolean {
  return node.type === "heading" && /^related\b/i.test(plainText(node).trim());
}

function linksIn(item: ListItem): Link[] {
  const found: Link[] = [];
  const visit = (node: Parent) => {
    for (const child of node.children) {
      if (child.type === "link") {
        found.push(child);
        continue;
      }
      if ("children" in child) {
        visit(child as Parent);
      }
    }
  };
  visit(item);
  return found;
}

function descriptionAfter(item: ListItem, link: Link): string {
  const paragraph = item.children.find((child) => child.type === "paragraph");
  const nodes: RootContent[] =
    paragraph && paragraph.type === "paragraph" ? paragraph.children : item.children;
  const start = nodes.indexOf(link);
  const rest = nodes
    .slice(start + 1)
    .map((node) => plainText(node as Parent))
    .join("");
  const cleaned = rest.replace(/^[\s—–\-:|=]+/, "").trim();
  return cleaned;
}

const GITHUB_BLOB = GITHUB_BLOB_BASE;

function docsHref(href: string, filePath: string | undefined): string {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    !filePath
  ) {
    return href;
  }

  const marker = `${path.sep}docs${path.sep}`;
  const docsAt = filePath.lastIndexOf(marker);
  if (docsAt < 0) {
    return href;
  }

  if (href.startsWith("/docs/")) {
    return href.replace(/\.mdx?$/, "").replace(/\/index$/, "");
  }
  if (href.startsWith("/")) {
    return href;
  }

  const docsRoot = filePath.slice(0, docsAt + marker.length - 1);
  const target = path.resolve(path.dirname(filePath), href);
  const relative = path.relative(docsRoot, target);
  const outsideDocs =
    relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  if (outsideDocs) {
    const fromRepo = path.relative(path.dirname(docsRoot), target).replace(/\\/g, "/");
    return `${GITHUB_BLOB}/${fromRepo}`;
  }
  const urlPath = relative
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "");
  if (urlPath.length === 0) {
    return "/docs";
  }
  return `/docs/${urlPath}`;
}

function cardElement(
  link: Link,
  item: ListItem,
  filePath: string | undefined,
  withDescription: boolean,
): MdxElement | null {
  const title = plainText(link).trim();
  if (title.length === 0) {
    return null;
  }
  const attributes: MdxAttribute[] = [
    { name: "href", type: "mdxJsxAttribute", value: docsHref(link.url, filePath) },
    { name: "title", type: "mdxJsxAttribute", value: title },
  ];
  if (withDescription) {
    const description = descriptionAfter(item, link);
    if (description.length > 0) {
      attributes.push({ name: "description", type: "mdxJsxAttribute", value: description });
    }
  }
  return {
    attributes,
    children: [],
    name: "Card",
    type: "mdxJsxFlowElement",
  };
}

function cardsFromItem(item: ListItem, filePath: string | undefined): MdxElement[] {
  const links = linksIn(item);
  if (links.length === 0) {
    return [];
  }
  const withDescription = links.length === 1;
  return links.flatMap((link) => {
    const card = cardElement(link, item, filePath, withDescription);
    return card ? [card] : [];
  });
}

/** Replace a Related list with link cards. */
export function remarkRelatedCards() {
  return (tree: Root, file: { path?: string }) => {
    const nodes = tree.children;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (!node || !isRelatedHeading(node)) {
        continue;
      }
      const list = nodes[index + 1];
      if (!list || list.type !== "list") {
        continue;
      }
      const items = (list as List).children;
      const cards = items.flatMap((item) => cardsFromItem(item, file.path));
      if (cards.length === 0) {
        continue;
      }
      const plain = items.filter((item) => linksIn(item).length === 0);
      const block: MdxElement = {
        attributes: [],
        children: cards as unknown as RootContent[],
        name: "Cards",
        type: "mdxJsxFlowElement",
      };
      const replacement: RootContent[] = [block as unknown as RootContent];
      if (plain.length > 0) {
        replacement.push({ ...(list as List), children: plain });
      }
      nodes.splice(index + 1, 1, ...replacement);
    }
  };
}
