import { formatMetadataTitle } from "@bondery/helpers";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import type { Metadata } from "next";
import { Contact, Team } from "@/components/landing";

export const metadata: Metadata = {
  alternates: {
    canonical: "/contact",
  },
  description: landing.Meta.ContactDescription,
  openGraph: {
    description: landing.Meta.ContactDescription,
    title: formatMetadataTitle(landing.Meta.ContactTitle),
    type: "website",
    url: "/contact",
  },
  title: landing.Meta.ContactTitle,
  twitter: {
    description: landing.Meta.ContactDescription,
    title: formatMetadataTitle(landing.Meta.ContactTitle),
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
