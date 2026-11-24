import { LegalDocument, legalDocuments, legalMetadata } from "@/components/legal";

export const metadata = legalMetadata("terms");

export default function TermsPage() {
  return <LegalDocument document={legalDocuments.terms} />;
}
