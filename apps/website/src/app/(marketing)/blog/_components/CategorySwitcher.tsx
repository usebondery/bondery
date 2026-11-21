"use client";

import blog from "@bondery/translations/locales/en/platform/website/WebsiteBlog.json" with {
  type: "json",
};
import { Tabs, Tooltip } from "@mantine/core";
import Link from "next/link";
import { BLOG_CATEGORIES, CATEGORY_ICONS } from "@/lib/blog/categories";
import type { PostCategory } from "../_lib";

type CategorySwitcherProps = {
  activeCategory: PostCategory;
};

const CATEGORY_TOOLTIPS: Record<PostCategory, string> = {
  all: blog.Tooltips.All,
  bonds: blog.Tooltips.Bonds,
  tech: blog.Tooltips.Tech,
  updates: blog.Tooltips.Updates,
};

const CATEGORY_LABELS: Record<PostCategory, string> = {
  all: blog.Categories.All,
  bonds: blog.Categories.Bonds,
  tech: blog.Categories.Tech,
  updates: blog.Categories.Updates,
};

export function CategorySwitcher({ activeCategory }: CategorySwitcherProps) {
  return (
    <Tabs value={activeCategory} variant="pills">
      <Tabs.List>
        {BLOG_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <Tooltip key={cat} label={CATEGORY_TOOLTIPS[cat]}>
              <Tabs.Tab
                leftSection={Icon ? <Icon size={16} /> : undefined}
                renderRoot={(props) => <Link href={`/blog/${cat}`} {...props} />}
                value={cat}
              >
                {CATEGORY_LABELS[cat]}
              </Tabs.Tab>
            </Tooltip>
          );
        })}
      </Tabs.List>
    </Tabs>
  );
}
