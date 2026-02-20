import Script from "next/script";
import { headers } from "next/headers";
import { Hero, Pricing, Faq, CallToAction, Features } from "@/components/landing";

const faqItems = [
  {
    question: "Is Bondery free to use?",
    answer: "Yes. Bondery is free during the beta phase.",
  },
  {
    question: "What is Bondery?",
    answer:
      "Bondery is an open-source personal CRM (=PRM) that helps you track relationships, remember key details, and stay connected with your network.",
  },
  {
    question: "Is my data private in Bondery?",
    answer:
      "Bondery is privacy-first and open source. Your relationship data is handled with a focus on user control and transparency.",
  },
  {
    question: "Why is data not E2EE (yet)?",
    answer:
      "End-to-end encryption is planned for the future, but our small team does not yet have the resources to implement robust E2EE correctly. Your data is still protected with our current safeguards (TLS for data in transit and AES encryption for the database at rest).",
  },
  {
    question: "Can I self-host Bondery?",
    answer:
      "Self-hosting is planned. Bondery is open source, and a self-hosting option is coming soon.",
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
