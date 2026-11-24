import { LegalDocument, legalDocuments, legalMetadata } from "@/components/legal";

export const metadata = legalMetadata("privacy");

export default function PrivacyPage() {
  return <LegalDocument document={legalDocuments.privacy} />;
}
