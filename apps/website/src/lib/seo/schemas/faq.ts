import type { FAQPage, WithContext } from "schema-dts";

export const FAQ_ITEMS = [
  {
    answer:
      "Bondery is an open-source personal CRM (=PRM) that helps you track relationships, remember key details, and stay connected with your network.",
    question: "What is Bondery?",
  },
  {
    answer:
      "Yes. Bondery is free with all the core features. A premium version exists for additional features, but the core personal PRM functionality will remain free forever.",
    question: "Is Bondery free to use?",
  },
  {
    answer:
      "Bondery is privacy-first and open source. Your relationship data is handled with a focus on user control and transparency. We will never sell your data or use it for advertising.",
    question: "Is my data private in Bondery?",
  },
  {
    answer:
      "Yes. Bondery is open source and ships a Docker Compose stack for self-hosting. See the self-hosting guide in the docs.",
    docsHref: "/docs/deploy/installation",
    docsLinkLabel: "self-hosting guide in the docs",
    question: "Can I self-host Bondery?",
  },
] as const;

type FaqItem = (typeof FAQ_ITEMS)[number];

export function buildFaqSchema(items: readonly FaqItem[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
      name: item.question,
    })),
  };
}
