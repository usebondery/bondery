import type { Metadata } from "next";
import { formatMetadataTitle } from "@bondery/helpers";
import { Contact, Team } from "@/components/landing";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Bondery team for support, feedback, and partnership inquiries.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: formatMetadataTitle("Contact"),
    description: "Contact the Bondery team for support, feedback, and partnership inquiries.",
    url: "/contact",
    type: "website",
  },
  twitter: {
    title: formatMetadataTitle("Contact"),
    description: "Contact the Bondery team for support, feedback, and partnership inquiries.",
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
