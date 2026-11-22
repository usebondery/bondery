import { PersonChip } from "@bondery/mantine-next";
import blog from "@bondery/translations/locales/en/platform/website/WebsiteBlog.json" with {
  type: "json",
};
import { Container, Flex, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useMDXComponents as getBlogMdxComponents } from "@/components/blog-mdx";
import { LANDING_SECTION_IDS } from "@/components/landing/sectionIds";
import { PageTopSpacer } from "@/components/page-top-spacer";
import { getTeamMember } from "@/data/team";
import { formatMessage } from "@/lib/i18n/message";
import { JsonLd } from "@/lib/seo/json-ld";
import { getCspNonce } from "@/lib/seo/nonce";
import { buildBlogPostingSchema } from "@/lib/seo/schemas/blog-posting";
import { getAllSlugs, getPostComponent, getPostMeta } from "../../_lib";
import { getPostReadingTime } from "../../_lib/server-utils";

const blogMdxComponents = getBlogMdxComponents({});

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export function generateStaticParams() {
  return getAllSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const meta = getPostMeta(category, slug);
  if (!meta) {
    return {};
  }

  const modifiedTime = meta.modifiedDate ?? meta.date;

  return {
    alternates: {
      canonical: `/blog/${category}/${slug}`,
    },
    authors: meta.author ? [{ name: meta.author }] : undefined,
    description: meta.description,
    keywords: meta.tags,
    openGraph: {
      authors: meta.author ? [meta.author] : undefined,
      description: meta.description,
      images: [`/og/blog/${category}/${slug}/image.webp`],
      modifiedTime,
      publishedTime: meta.date,
      tags: meta.tags,
      title: meta.title,
      type: "article",
      url: `/blog/${category}/${slug}`,
    },
    title: {
      absolute: meta.title,
    },
    twitter: {
      description: meta.description,
      images: [`/og/blog/${category}/${slug}/image.webp`],
      title: meta.title,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { category, slug } = await params;
  const meta = getPostMeta(category, slug);
  if (!meta) {
    notFound();
  }

  const Content = getPostComponent(category, slug);
  if (!Content) {
    notFound();
  }

  const nonce = await getCspNonce();
  const readingTime = getPostReadingTime(category, slug);

  const authorChip = meta.author
    ? (() => {
        const member = getTeamMember(meta.author);
        if (!member) {
          return null;
        }
        return {
          avatar: member.image as string | null,
          firstName: member.name,
          id: member.name.toLowerCase(),
          lastName: null as string | null,
        };
      })()
    : null;

  const formattedDate = new Date(meta.date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <JsonLd
        data={buildBlogPostingSchema(meta, category, slug)}
        id={`schema-blog-posting-${slug}`}
        nonce={nonce}
      />
      <Container pb="xl" size="sm">
        <PageTopSpacer size="large" />
        <Stack gap="xl">
          <Stack align="center" gap="xs">
            <Title order={1} ta="center">
              {meta.title}
            </Title>
            <Flex align="center" gap="xs" justify="center">
              <Text c="dimmed" size="sm">
                {formattedDate}
              </Text>
              <Text c="dimmed" size="sm">
                ·
              </Text>
              <Text c="dimmed" size="sm">
                {formatMessage(blog.ReadingTime, { minutes: readingTime })}
              </Text>
            </Flex>
            {authorChip ? (
              <PersonChip
                href={`/contact#${LANDING_SECTION_IDS.team}`}
                isClickable
                person={authorChip}
              />
            ) : null}
          </Stack>

          <article>
            {/* biome-ignore lint/nursery/useReactCompiler: MDX entry is resolved per slug at request time */}
            <Content components={blogMdxComponents} />
          </article>
        </Stack>
      </Container>
    </>
  );
}
