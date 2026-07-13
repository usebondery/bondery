import { formatMetadataTitle } from "@bondery/helpers";
import type { Metadata } from "next";
import { Privacy } from "@/components/legal";

export const metadata: Metadata = {
  alternates: {
    canonical: "/privacy",
  },
  description: "Learn how Bondery collects, uses, and protects your data.",
  openGraph: {
    description: "Learn how Bondery collects, uses, and protects your data.",
    title: formatMetadataTitle("Privacy Policy"),
    type: "website",
    url: "/privacy",
  },
  title: "Privacy Policy",
  twitter: {
    description: "Learn how Bondery collects, uses, and protects your data.",
    title: formatMetadataTitle("Privacy Policy"),
  },
};

export default function PrivacyPage() {
  return <Privacy />;
}
