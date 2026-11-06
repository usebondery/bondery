import { formatMetadataTitle } from "@bondery/helpers";
import { Container, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTopSpacer } from "@/components/page-top-spacer";
import { BLOG_CATEGORIES, getBlogCategoryTitle } from "@/lib/blog/categories";
import { BlogCard, CategorySwitcher } from "../_components";
import type { PostCategory } from "../_lib";
import { getPostsByCategory } from "../_lib";

type Props = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = getBlogCategoryTitle(category);

  const descriptions: Record<string, string> = {
    all: "Stay up to date with Bondery — product updates, relationship tips, and networking insights from the team behind the open-source PRM.",
    bonds:
      "Tips and insights on building meaningful relationships, effective networking, and strong networks.",
    tech: "Technical deep-dives on Bondery's architecture, infrastructure, and engineering decisions.",
    updates: "Product updates, feature releases, and development news from Bondery.",
  };

  const description = descriptions[category] ?? descriptions.all;

  return {
    alternates: {
      canonical: `/blog/${category}`,
    },
    description,
    openGraph: {
      description,
      title: formatMetadataTitle(label),
      type: "website",
      url: `/blog/${category}`,
    },
    title: label,
    twitter: {
      description,
      title: formatMetadataTitle(label),
    },
  };
}

export default async function BlogCategoryPage({ params }: Props) {
  const { category } = await params;

  if (!BLOG_CATEGORIES.includes(category as PostCategory)) {
    notFound();
  }

  const posts = getPostsByCategory(category as PostCategory);

  return (
    <Container pb="xl" size="md">
      <PageTopSpacer size="large" />
      <Stack align="center" gap="xl">
        <Title order={1}>Blog</Title>

        <CategorySwitcher activeCategory={category as PostCategory} />

        {posts.length === 0 ? (
          <Text c="dimmed" py="xl" ta="center">
            No posts yet in this category.
          </Text>
        ) : (
          <SimpleGrid cols={1} spacing="md" w="100%">
            {posts.map((post) => (
              <BlogCard key={post.slug} {...post} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
