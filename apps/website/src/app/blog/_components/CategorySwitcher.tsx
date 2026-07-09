"use client";

import { Tabs, Tooltip } from "@mantine/core";
import Link from "next/link";
import type { PostCategory } from "../_lib";
import { BLOG_CATEGORIES, CATEGORY_ICONS } from "../_lib";

type CategorySwitcherProps = {
  activeCategory: PostCategory;
};

const CATEGORY_TOOLTIPS: Record<PostCategory, string> = {
  all: "Browse all blog posts",
  bonds: "Articles about networking and relationships",
  product: "Usually monthly product updates",
};

export function CategorySwitcher({ activeCategory }: CategorySwitcherProps) {
  return (
    <Tabs value={activeCategory} variant="pills">
      <Tabs.List>
        {BLOG_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <Tooltip key={cat} label={CATEGORY_TOOLTIPS[cat]} withArrow>
              <Tabs.Tab
                leftSection={Icon ? <Icon size={16} /> : undefined}
                renderRoot={(props) => <Link href={`/blog/${cat}`} {...props} />}
                value={cat}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Tabs.Tab>
            </Tooltip>
          );
        })}
      </Tabs.List>
    </Tabs>
  );
}
