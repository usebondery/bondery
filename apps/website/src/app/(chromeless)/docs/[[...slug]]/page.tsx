import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpenAPIPage } from "@/components/api-page";
import { getMDXComponents } from "@/components/mdx";
import {
  getChangelogIndexToc,
  isChangelogIndexSlug,
  isUnpublishedChangelogSlug,
} from "@/lib/changelog";
import { getDocsGithubUrl, getPageMarkdownUrl } from "@/lib/get-llm-text";
import { openapi } from "@/lib/openapi";
import { getPageImage, source } from "@/lib/source";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function DocPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug ?? [];

  if (isUnpublishedChangelogSlug(slug)) {
    notFound();
  }

  const page = source.getPage(slug);
  if (!page) {
    notFound();
  }

  const MDX = page.data.body;
  const lastEdit = page.data.lastModified ? new Date(page.data.lastModified) : null;
  const markdownUrl = getPageMarkdownUrl(page);
  const githubUrl = getDocsGithubUrl(page);
  const toc = isChangelogIndexSlug(slug) ? getChangelogIndexToc() : page.data.toc;

  return (
    <DocsPage full={page.data.full} toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? (
        <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      ) : null}
      <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover githubUrl={githubUrl} markdownUrl={markdownUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
            OpenAPIPage: async (openApiProps) => (
              <OpenAPIPage {...openApiProps} {...(await openapi.preloadOpenAPIPage(page))} />
            ),
          })}
        />
      </DocsBody>
      {lastEdit ? <PageLastUpdate className="mt-8" date={lastEdit} /> : null}
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams().filter((param) => !isUnpublishedChangelogSlug(param.slug));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const slug = params.slug ?? [];

  if (isUnpublishedChangelogSlug(slug)) {
    notFound();
  }

  const page = source.getPage(slug);
  if (!page) {
    notFound();
  }

  const image = getPageImage(page).url;

  return {
    description: page.data.description,
    openGraph: {
      images: [image],
    },
    title: page.data.title,
    twitter: {
      card: "summary_large_image",
      images: [image],
    },
  };
}
