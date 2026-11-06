import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";
import { filterDocsComponent, stringifyDocsComponent } from "@/lib/mdx-markdown";

export const docs = defineDocs({
  dir: "../../docs",
  docs: {
    files: ["**/*.mdx"],
    postprocess: {
      includeProcessedMarkdown: {
        filterElement: filterDocsComponent,
        stringify: stringifyDocsComponent,
      },
    },
    schema: pageSchema.extend({
      description: z.string().optional(),
      docId: z.string().optional(),
      docPath: z.string().optional(),
      docSections: z.record(z.string(), z.string()).optional(),
      hidden: z.boolean().optional(),
      icon: z.string().optional(),
      /**
       * Calendar date of the last substantive edit, e.g. `2026-09-30`.
       * Authored by hand, so a typo fix can leave it alone.
       * `pnpm run check:docs:frontmatter` enforces its presence.
       */
      last_updated: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "last_updated must be a YYYY-MM-DD date")
        .optional(),
    }),
  },
  meta: { schema: metaSchema },
});
