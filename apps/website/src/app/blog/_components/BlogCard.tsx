import { AnchorLink } from "@bondery/mantine-next";
import { Flex, Paper, Text, ThemeIcon, Title } from "@mantine/core";
import { CATEGORY_ICONS } from "../_lib/categories";
import type { PostMeta } from "../_lib/types";

type BlogCardProps = Pick<PostMeta, "title" | "date" | "description" | "category" | "slug">;

export function BlogCard({ title, date, description, category, slug }: BlogCardProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const CategoryIcon = CATEGORY_ICONS[category];

  return (
    <AnchorLink href={`/blog/${category}/${slug}`} underline="never">
      <Paper
        className="card-scale-effect"
        p="lg"
        radius="md"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
        }}
        withBorder
      >
        <Flex align="flex-start" gap="lg">
          {CategoryIcon && (
            <ThemeIcon radius="md" size="xl" variant="light">
              <CategoryIcon size={24} />
            </ThemeIcon>
          )}
          <Flex direction="column" gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Title lineClamp={1} order={3}>
              {title}
            </Title>
            <Text c="dimmed" size="sm">
              {formattedDate}
            </Text>
            <Text c="dimmed" lineClamp={2} mt={4}>
              {description}
            </Text>
          </Flex>
        </Flex>
      </Paper>
    </AnchorLink>
  );
}
