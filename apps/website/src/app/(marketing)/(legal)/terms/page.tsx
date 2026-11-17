import { formatMetadataTitle } from "@bondery/helpers";
import type { Metadata } from "next";
import { Terms } from "@/components/legal";

const TERMS_DESCRIPTION =
  "The agreement that covers your use of Bondery: your account, your contacts, plans and billing, acceptable use, and how disputes are handled.";

export const metadata: Metadata = {
  alternates: {
    canonical: "/terms",
  },
  description: TERMS_DESCRIPTION,
  openGraph: {
    description: TERMS_DESCRIPTION,
    title: formatMetadataTitle("Terms of Service"),
    type: "article",
    url: "/terms",
  },
  title: "Terms of Service",
  twitter: {
    description: TERMS_DESCRIPTION,
    title: formatMetadataTitle("Terms of Service"),
  },
};

export default function TermsPage() {
  return <Terms />;
}
