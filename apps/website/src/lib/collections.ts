import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

export const docs = defineDocs({
  dir: "../../docs",
  docs: {
    files: ["**/*.mdx"],
    postprocess: { includeProcessedMarkdown: true },
    schema: pageSchema.extend({
      description: z.string().optional(),
      docId: z.string().optional(),
      docPath: z.string().optional(),
      docSections: z.record(z.string(), z.string()).optional(),
      hidden: z.boolean().optional(),
      icon: z.string().optional(),
    }),
  },
  meta: { schema: metaSchema },
});
