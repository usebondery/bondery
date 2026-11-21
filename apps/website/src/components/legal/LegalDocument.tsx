import { formatCalendarDate, formatMetadataTitle } from "@bondery/helpers";
import type { Metadata } from "next";
import {
  type LegalDocumentEntry,
  type LegalSlug,
  legalDocuments,
} from "../../../content/legal/documents";
import { legalMdxComponents } from "./legal-mdx";
import { LegalDocumentLayout } from "./shared/LegalDocumentLayout";

/** Renders one legal document inside the shared frame. */
export function LegalDocument({ document }: { document: LegalDocumentEntry }) {
  const { Content, meta } = document;

  return (
    <LegalDocumentLayout
      lastUpdated={formatCalendarDate(meta.lastUpdated) ?? meta.lastUpdated}
      title={meta.title}
    >
      <Content components={legalMdxComponents} />
    </LegalDocumentLayout>
  );
}

/** Page metadata for a legal document, derived from the same entry the page renders. */
export function legalMetadata(slug: LegalSlug): Metadata {
  const { meta } = legalDocuments[slug];
  const url = `/${slug}`;
  const title = formatMetadataTitle(meta.title);

  return {
    alternates: { canonical: url },
    description: meta.description,
    openGraph: { description: meta.description, title, type: meta.openGraphType, url },
    title: meta.title,
    twitter: { description: meta.description, title },
  };
}
