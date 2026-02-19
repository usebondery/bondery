import type { Metadata } from "next";
import { Privacy } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Bondery collects, uses, and protects your data.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Bondery",
    description: "Learn how Bondery collects, uses, and protects your data.",
    url: "/privacy",
    type: "website",
  },
  twitter: {
    title: "Privacy Policy | Bondery",
    description: "Learn how Bondery collects, uses, and protects your data.",
  },
};

export default function PrivacyPage() {
  return <Privacy />;
}
