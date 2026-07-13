import { formatMetadataTitle } from "@bondery/helpers";
import type { Metadata } from "next";
import { Contact, Team } from "@/components/landing";

export const metadata: Metadata = {
  alternates: {
    canonical: "/contact",
  },
  description: "Contact the Bondery team for support, feedback, and partnership inquiries.",
  openGraph: {
    description: "Contact the Bondery team for support, feedback, and partnership inquiries.",
    title: formatMetadataTitle("Contact"),
    type: "website",
    url: "/contact",
  },
  title: "Contact",
  twitter: {
    description: "Contact the Bondery team for support, feedback, and partnership inquiries.",
    title: formatMetadataTitle("Contact"),
  },
};

export default function ContactPage() {
  return (
    <>
      <Contact />
      <Team />
    </>
  );
}
