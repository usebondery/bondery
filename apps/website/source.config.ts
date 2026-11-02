import { defineConfig } from "fumadocs-mdx/config";
import remarkGfm from "remark-gfm";

export default defineConfig({
  mdxOptions: {
    providerImportSource: "@/components/mdx",
    remarkPlugins: [remarkGfm],
  },
});
