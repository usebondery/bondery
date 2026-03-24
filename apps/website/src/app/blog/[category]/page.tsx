import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { BlogCard, CategorySwitcher } from "../_components";
import { BLOG_CATEGORIES, getPostsByCategory } from "../_lib";
import type { PostCategory } from "../_lib";

type Props = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label =
    category === "all" ? "Blog" : `${category.charAt(0).toUpperCase() + category.slice(1)} Blog`;

  const descriptions: Record<string, string> = {
    all: "Stay up to date with Bondery — product updates, relationship tips, and networking insights from the team behind the open-source PRM.",
    product: "Product updates, feature releases, and development news from Bondery.",
    bonds:
      "Tips and insights on building meaningful relationships, effective networking, and strong networks.",
  };

  return {
    title: label,
    description: descriptions[category] ?? descriptions.all,
    alternates: {
      canonical: `/blog/${category}`,
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
    <Container size="md" pt={60} pb="xl">
      <Stack gap="xl" align="center">
        <Title order={1}>Blog</Title>

        <CategorySwitcher activeCategory={category as PostCategory} />

        {posts.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
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
