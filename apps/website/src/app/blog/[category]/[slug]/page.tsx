import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Flex, Stack, Text, Title } from "@mantine/core";
import { formatMetadataTitle } from "@bondery/helpers";
import { PersonChip } from "@bondery/mantine-next";
import { WEBSITE_URL } from "@/lib/config";
import Script from "next/script";
import { headers } from "next/headers";
import { getAllSlugs, getPostMeta, getPostComponent } from "../../_lib";
import { getTeamMember } from "@/data/team";
import { getPostReadingTime } from "../../_lib/server-utils";

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export function generateStaticParams() {
  return getAllSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const meta = getPostMeta(category, slug);
  if (!meta) return {};

  const modifiedTime = meta.modifiedDate ?? meta.date;

  return {
    title: meta.title,
    description: meta.description,
    authors: meta.author ? [{ name: meta.author }] : undefined,
    keywords: meta.tags,
    alternates: {
      canonical: `/blog/${category}/${slug}`,
    },
    openGraph: {
      title: formatMetadataTitle(meta.title),
      description: meta.description,
      url: `/blog/${category}/${slug}`,
      type: "article",
      publishedTime: meta.date,
      modifiedTime,
      authors: meta.author ? [meta.author] : undefined,
      tags: meta.tags,
    },
    twitter: {
      title: formatMetadataTitle(meta.title),
      description: meta.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { category, slug } = await params;
  const meta = getPostMeta(category, slug);
  if (!meta) notFound();

  const Content = getPostComponent(category, slug);
  if (!Content) notFound();

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const readingTime = getPostReadingTime(category, slug);

  const authorChip = meta.author
    ? (() => {
        const member = getTeamMember(meta.author);
        if (!member) return null;
        return {
          id: member.name.toLowerCase(),
          firstName: member.name,
          lastName: null as string | null,
          avatar: member.image as string | null,
        };
      })()
    : null;

  const formattedDate = new Date(meta.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    dateModified: meta.modifiedDate ?? meta.date,
    url: `${WEBSITE_URL}/blog/${category}/${slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${WEBSITE_URL}/blog/${category}/${slug}`,
    },
    publisher: {
      "@id": `${WEBSITE_URL}#organization`,
    },
    ...(meta.author && {
      author: {
        "@type": "Person",
        name: meta.author,
      },
    }),
    ...(meta.tags && { keywords: meta.tags.join(", ") }),
  };

  return (
    <>
      <Script
        id={`schema-blog-posting-${slug}`}
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <Container size="sm" pt={60} pb="xl">
        <Stack gap="xl">
          <Stack gap="xs" align="center">
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
                {readingTime} min read
              </Text>
            </Flex>
            {authorChip && <PersonChip person={authorChip} isClickable href="/contact#team" />}
          </Stack>

          <article>
            <Content />
          </article>
        </Stack>
      </Container>
    </>
  );
}
