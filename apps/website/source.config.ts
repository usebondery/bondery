import { defineConfig } from "fumadocs-mdx/config";
import remarkGfm from "remark-gfm";
import { remarkRelatedCards } from "./src/lib/remark-related-cards";

export default defineConfig({
  mdxOptions: {
    providerImportSource: "@/components/mdx",
    rehypeCodeOptions: false,
    remarkPlugins: [remarkGfm, remarkRelatedCards],
  },
});
