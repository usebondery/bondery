import { findNeighbour } from "fumadocs-core/page-tree";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { OpenAPIPage } from "@/components/api-page";
import { DocsFolderIndex } from "@/components/docs/DocsFolderIndex";
import { DocsPage } from "@/components/docs/DocsPage";
import type { DocsTocItem } from "@/components/docs/PageToc";
import { getMDXComponents } from "@/components/mdx";
import { RichAnchor } from "@/components/RichAnchor";
import {
  getChangelogIndexToc,
  isChangelogIndexSlug,
  isUnpublishedChangelogSlug,
} from "@/lib/changelog";
import { findFolderByPath, folderDescription, listFolderSlugs } from "@/lib/docs-folders";
import { resolveDocsHref } from "@/lib/docs-href";
import { getDocsLastUpdated } from "@/lib/docs-last-updated";
import { filterPageTreeForPathname } from "@/lib/docs-tree";
import { getDocsGithubUrl, getDocsPageUrl, getPageMarkdownUrl } from "@/lib/get-llm-text";
import { openapi } from "@/lib/openapi";
import { getFilteredPageTree, getPageImage, source } from "@/lib/source";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

type TocEntry = {
  depth: number;
  title: ReactNode;
  url: string;
};

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textFromNode).join("");
  }
  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { children?: ReactNode };
    return textFromNode(props.children);
  }
  return "";
}

function toDocsToc(toc: TocEntry[]): DocsTocItem[] {
  const items: DocsTocItem[] = [];

  for (const item of toc) {
    const title = textFromNode(item.title).trim();
    const id = item.url.replace(/^#/, "");
    if (!title || !id) {
      continue;
    }

    items.push({ depth: item.depth, id, title });
  }

  return items;
}

function footerLink(item: { name: ReactNode; url: string } | undefined) {
  if (!item) {
    return null;
  }

  return {
    title: typeof item.name === "string" ? item.name : item.url,
    url: item.url,
  };
}

function createPageLink(pageUrl: string) {
  return function PageLink({ children, href }: { children?: ReactNode; href?: string }) {
    if (typeof href !== "string") {
      return children;
    }

    return <RichAnchor href={resolveDocsHref(href, pageUrl)}>{children}</RichAnchor>;
  };
}

export default async function DocPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug ?? [];

  if (isUnpublishedChangelogSlug(slug)) {
    notFound();
  }

  const page = source.getPage(slug);
  if (!page) {
    const folder = findFolderByPath(getFilteredPageTree().children, `/docs/${slug.join("/")}`);
    if (!folder || typeof folder.name !== "string") {
      notFound();
    }

    return (
      <DocsPage description={folderDescription(folder)} title={folder.name} toc={[]}>
        <DocsFolderIndex folder={folder} />
      </DocsPage>
    );
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page);
  const githubUrl = getDocsGithubUrl(page);
  const pageUrl = getDocsPageUrl(page);
  const lastUpdated = getDocsLastUpdated(page);
  const toc = toDocsToc(isChangelogIndexSlug(slug) ? getChangelogIndexToc() : page.data.toc);
  const neighbour = findNeighbour(
    filterPageTreeForPathname(getFilteredPageTree(), page.url),
    page.url,
  );

  return (
    <DocsPage
      description={page.data.description}
      footer={{
        next: footerLink(neighbour.next),
        previous: footerLink(neighbour.previous),
      }}
      full={page.data.full}
      githubUrl={githubUrl}
      lastUpdated={lastUpdated}
      markdownUrl={markdownUrl}
      pageUrl={pageUrl}
      title={page.data.title}
      toc={toc}
    >
      <MDX
        components={getMDXComponents({
          a: createPageLink(page.url),
          OpenAPIPage: async (openApiProps) => (
            <OpenAPIPage
              {...openApiProps}
              showDescription={false}
              {...(await openapi.preloadOpenAPIPage(page))}
            />
          ),
        })}
      />
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const pageParams = source
    .generateParams()
    .filter((param) => !isUnpublishedChangelogSlug(param.slug));
  const known = new Set(pageParams.map((param) => (param.slug ?? []).join("/")));
  const folderParams = listFolderSlugs(getFilteredPageTree().children, known).map((slug) => ({
    slug,
  }));
  return [...pageParams, ...folderParams];
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const slug = params.slug ?? [];

  if (isUnpublishedChangelogSlug(slug)) {
    notFound();
  }

  const page = source.getPage(slug);
  if (!page) {
    const folder = findFolderByPath(getFilteredPageTree().children, `/docs/${slug.join("/")}`);
    if (!folder || typeof folder.name !== "string") {
      notFound();
    }

    return {
      alternates: {
        canonical: `/docs/${slug.join("/")}`,
      },
      description: folderDescription(folder),
      title: folder.name,
    };
  }

  const image = getPageImage(page).url;
  const isHidden = page.data.hidden === true;

  return {
    alternates: {
      canonical: page.url,
    },
    description: page.data.description,
    openGraph: {
      images: [image],
    },
    robots: isHidden ? { follow: false, index: false } : undefined,
    title: page.data.title,
    twitter: {
      card: "summary_large_image",
      images: [image],
    },
  };
}
