import { formatMetadataTitle } from "@bondery/helpers";
import blog from "@bondery/translations/locales/en/platform/website/WebsiteBlog.json" with {
  type: "json",
};
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
    all: blog.Descriptions.All,
    bonds: blog.Descriptions.Bonds,
    tech: blog.Descriptions.Tech,
    updates: blog.Descriptions.Updates,
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
        <Title order={1}>{blog.Title}</Title>

        <CategorySwitcher activeCategory={category as PostCategory} />

        {posts.length === 0 ? (
          <Text c="dimmed" py="xl" ta="center">
            {blog.EmptyCategory}
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
