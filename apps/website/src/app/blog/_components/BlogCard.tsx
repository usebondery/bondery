import { Flex, Paper, Text, ThemeIcon, Title } from "@mantine/core";
import { AnchorLink } from "@bondery/mantine-next";
import type { PostMeta } from "../_lib/types";
import { CATEGORY_ICONS } from "../_lib/categories";

type BlogCardProps = Pick<PostMeta, "title" | "date" | "description" | "category" | "slug">;

export function BlogCard({ title, date, description, category, slug }: BlogCardProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const CategoryIcon = CATEGORY_ICONS[category];

  return (
    <AnchorLink href={`/blog/${category}/${slug}`} underline="never">
      <Paper
        withBorder
        p="lg"
        radius="md"
        className="card-scale-effect"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
        }}
      >
        <Flex gap="lg" align="flex-start">
          {CategoryIcon && (
            <ThemeIcon variant="light" size="xl" radius="md">
              <CategoryIcon size={24} />
            </ThemeIcon>
          )}
          <Flex direction="column" gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} lineClamp={1}>
              {title}
            </Title>
            <Text size="sm" c="dimmed">
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
