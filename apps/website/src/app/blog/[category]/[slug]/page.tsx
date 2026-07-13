import { formatMetadataTitle } from "@bondery/helpers";
import { PersonChip } from "@bondery/mantine-next";
import { Container, Flex, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeamMember } from "@/data/team";
import { JsonLd } from "@/lib/seo/json-ld";
import { getCspNonce } from "@/lib/seo/nonce";
import { buildBlogPostingSchema } from "@/lib/seo/schemas/blog-posting";
import { getAllSlugs, getPostComponent, getPostMeta } from "../../_lib";
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
      modifiedTime,
      publishedTime: meta.date,
      tags: meta.tags,
      title: formatMetadataTitle(meta.title),
      type: "article",
      url: `/blog/${category}/${slug}`,
    },
    title: meta.title,
    twitter: {
      description: meta.description,
      title: formatMetadataTitle(meta.title),
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
      <Container pb="xl" pt={60} size="sm">
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
                {readingTime} min read
              </Text>
            </Flex>
            {authorChip && <PersonChip href="/contact#team" isClickable person={authorChip} />}
          </Stack>

          <article>
            <Content />
          </article>
        </Stack>
      </Container>
    </>
  );
}
