import { SOCIAL_LINKS, SUPPORT_EMAIL } from "@bondery/helpers";
import type { Organization, SoftwareApplication, WebSite, WithContext } from "schema-dts";
import { WEBSITE_URL } from "@/lib/config";
import { ORGANIZATION_ID, SOFTWARE_APPLICATION_ID, WEBSITE_ID } from "../constants";
import { SITE_DESCRIPTION } from "../copy";

export function buildOrganizationSchema(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@id": ORGANIZATION_ID,
    "@type": "Organization",
    contactPoint: [
      {
        "@type": "ContactPoint",
        availableLanguage: ["en"],
        contactType: "customer support",
        email: SUPPORT_EMAIL,
      },
    ],
    description: SITE_DESCRIPTION,
    logo: `${WEBSITE_URL}/logo.svg`,
    name: "Bondery",
    sameAs: [SOCIAL_LINKS.github, SOCIAL_LINKS.linkedin, SOCIAL_LINKS.reddit, SOCIAL_LINKS.x],
    url: WEBSITE_URL,
  };
}

export function buildWebsiteSchema(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@id": WEBSITE_ID,
    "@type": "WebSite",
    description: SITE_DESCRIPTION,
    inLanguage: "en-US",
    name: "Bondery",
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url: WEBSITE_URL,
  };
}

export function buildSoftwareApplicationSchema(): WithContext<SoftwareApplication> {
  return {
    "@context": "https://schema.org",
    "@id": SOFTWARE_APPLICATION_ID,
    "@type": "SoftwareApplication",
    applicationCategory: "SocialNetworkingApplication",
    applicationSubCategory: "Personal Relationship Manager",
    description: SITE_DESCRIPTION,
    inLanguage: "en-US",
    name: "Bondery",
    offers: {
      "@type": "Offer",
      category: "Free",
      price: "0",
      priceCurrency: "USD",
    },
    operatingSystem: "Web",
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url: WEBSITE_URL,
  };
}
