import type { FAQPage, WithContext } from "schema-dts";

export const FAQ_ITEMS = [
  {
    answer:
      "Bondery is an open-source personal CRM (=PRM) that helps you track relationships, remember key details, and stay connected with your network.",
    question: "What is Bondery?",
  },
  {
    answer:
      "Yes. Bondery is free with all features unlocked for the beta phase. In the future, there will be a paid tier with additional features, but the core personal PRM functionality will remain free forever.",
    question: "Is Bondery free to use?",
  },
  {
    answer:
      "Bondery is privacy-first and open source. Your relationship data is handled with a focus on user control and transparency. We will never sell your data or use it for advertising.",
    question: "Is my data private in Bondery?",
  },
  {
    answer:
      "End-to-end encryption is planned for the future, but our small team does not yet have the resources to implement robust E2EE correctly without making the user experience too slow. Your data is still protected with our current safeguards (TLS for data in transit and AES encryption for the database at rest).",
    question: "Why is data not E2EE (yet)?",
  },
  {
    answer:
      "Yes. Bondery is open source and ships a Docker Compose stack (api, webapp, Redis, and Supabase) for self-hosting. See the self-hosting guide in the docs.",
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
