import type { Metadata } from "next";
import { formatMetadataTitle } from "@bondery/helpers";
import { Terms } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Bondery Terms of Service page. This legal text is currently in progress.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: formatMetadataTitle("Terms of Service"),
    description: "Bondery Terms of Service page. This legal text is currently in progress.",
    url: "/terms",
    type: "article",
  },
  twitter: {
    title: formatMetadataTitle("Terms of Service"),
    description: "Bondery Terms of Service page. This legal text is currently in progress.",
  },
};

export default function TermsPage() {
  return <Terms />;
}
