import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import type { FAQPage, WithContext } from "schema-dts";

const FAQ_ITEMS = [
  {
    answer: landing.Faq.Items.WhatIs.Answer,
    question: landing.Faq.Items.WhatIs.Question,
  },
  {
    answer: landing.Faq.Items.Free.Answer,
    question: landing.Faq.Items.Free.Question,
  },
  {
    answer: landing.Faq.Items.Private.Answer,
    question: landing.Faq.Items.Private.Question,
  },
  {
    answer: landing.Faq.Items.SelfHost.Answer,
    docsHref: "/docs/deploy/installation",
    docsLinkLabel: landing.Faq.Items.SelfHost.DocsLinkLabel,
    question: landing.Faq.Items.SelfHost.Question,
  },
] as const;

type FaqItem = (typeof FAQ_ITEMS)[number];

function buildFaqSchema(items: readonly FaqItem[]): WithContext<FAQPage> {
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

export { buildFaqSchema, FAQ_ITEMS };
