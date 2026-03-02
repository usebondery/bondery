import Script from "next/script";
import { headers } from "next/headers";
import { Hero, Pricing, Faq, CallToAction, Features } from "@/components/landing";

const faqItems = [
  {
    question: "What is Bondery?",
    answer:
      "Bondery is an open-source personal CRM (=PRM) that helps you track relationships, remember key details, and stay connected with your network.",
  },
  {
    question: "Is Bondery free to use?",
    answer:
      "Yes. Bondery is free with all features unlocked for the beta phase. In the future, there will be a paid tier with additional features, but the core personal PRM functionality will remain free forever.",
  },
  {
    question: "Is my data private in Bondery?",
    answer:
      "Bondery is privacy-first and open source. Your relationship data is handled with a focus on user control and transparency. We will never sell your data or use it for advertising.",
  },
  {
    question: "Why is data not E2EE (yet)?",
    answer:
      "End-to-end encryption is planned for the future, but our small team does not yet have the resources to implement robust E2EE correctly without making the too slow. Your data is still protected with our current safeguards (TLS for data in transit and AES encryption for the database at rest).",
  },
  {
    question: "Can I self-host Bondery?",
    answer:
      "Self-hosting is planned. Bondery is open source, and we will make it available for self-hosting in the future.",
  },
] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
} as const;

export default async function Home() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <Faq items={faqItems} />
      <Script
        id="schema-faq"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <CallToAction />
    </>
  );
}
