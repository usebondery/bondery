import { formatMetadataTitle } from "@bondery/helpers";
import type { Metadata } from "next";
import { Terms } from "@/components/legal";

export const metadata: Metadata = {
  alternates: {
    canonical: "/terms",
  },
  description: "Bondery Terms of Service page. This legal text is currently in progress.",
  openGraph: {
    description: "Bondery Terms of Service page. This legal text is currently in progress.",
    title: formatMetadataTitle("Terms of Service"),
    type: "article",
    url: "/terms",
  },
  title: "Terms of Service",
  twitter: {
    description: "Bondery Terms of Service page. This legal text is currently in progress.",
    title: formatMetadataTitle("Terms of Service"),
  },
};

export default function TermsPage() {
  return <Terms />;
}
