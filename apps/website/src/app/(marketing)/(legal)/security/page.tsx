import { LegalDocument, legalDocuments, legalMetadata } from "@/components/legal";

export const metadata = legalMetadata("security");

export default function SecurityPage() {
  return <LegalDocument document={legalDocuments.security} />;
}
