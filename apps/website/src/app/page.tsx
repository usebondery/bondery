import { CallToAction, Faq, Features, Hero, Pricing } from "@/components/landing";
import { JsonLd } from "@/lib/seo/json-ld";
import { getCspNonce } from "@/lib/seo/nonce";
import { buildFaqSchema, FAQ_ITEMS } from "@/lib/seo/schemas/faq";

export default async function Home() {
  const nonce = await getCspNonce();

  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <Faq items={FAQ_ITEMS} />
      <JsonLd data={buildFaqSchema(FAQ_ITEMS)} id="schema-faq" nonce={nonce} />
      <CallToAction />
    </>
  );
}
