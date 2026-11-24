import legal from "@bondery/translations/locales/en/platform/website/WebsiteLegal.json" with {
  type: "json",
};
import type { MDXContent } from "mdx/types";
import Privacy from "./en/privacy.mdx";
import Security from "./en/security.mdx";
import Terms from "./en/terms.mdx";

export type LegalSlug = "privacy" | "security" | "terms";

export interface LegalDocumentMeta {
  description: string;
  /** Calendar date of the last change, as `YYYY-MM-DD`. The page formats it. */
  lastUpdated: string;
  openGraphType: "article" | "website";
  title: string;
}

export interface LegalDocumentEntry {
  Content: MDXContent;
  meta: LegalDocumentMeta;
}

/**
 * Legal documents, English only. The prose lives in `./en/*.mdx`. To localize a document, add
 * `./<locale>/<slug>.mdx` and pick the entry by locale here. Do not split the prose into catalog
 * keys: a translated document is reviewed as a whole.
 */
export const legalDocuments = {
  privacy: {
    Content: Privacy,
    meta: {
      description: legal.Documents.Privacy.Description,
      lastUpdated: "2026-11-02",
      openGraphType: "website",
      title: legal.Documents.Privacy.Title,
    },
  },
  security: {
    Content: Security,
    meta: {
      description: legal.Documents.Security.Description,
      lastUpdated: "2026-08-31",
      openGraphType: "website",
      title: legal.Documents.Security.Title,
    },
  },
  terms: {
    Content: Terms,
    meta: {
      description: legal.Documents.Terms.Description,
      lastUpdated: "2026-11-13",
      openGraphType: "article",
      title: legal.Documents.Terms.Title,
    },
  },
} satisfies Record<LegalSlug, LegalDocumentEntry>;
