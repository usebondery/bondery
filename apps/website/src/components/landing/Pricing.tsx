import { ButtonLink } from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Container } from "@mantine/core";
import { hrefWebappLogin } from "@/lib/navigation/href/webapp";
import { Reveal } from "./features/Reveal";
import { SectionHeader } from "./features/SectionHeader";
import { PricingCard } from "./PricingCard";

const FREE_FEATURES = [
  landing.Pricing.Free.Features.Contacts,
  landing.Pricing.Free.Features.History,
  landing.Pricing.Free.Features.Reminders,
] as const;

const PREMIUM_FEATURES = [
  landing.Pricing.Premium.Features.AiAssistant,
  landing.Pricing.Premium.Features.SmartSearch,
  landing.Pricing.Premium.Features.WritingCopilot,
  landing.Pricing.Premium.Features.PrioritySupport,
] as const;

export function Pricing() {
  return (
    <Container
      bg="var(--mantine-color-body)"
      fluid
      id="pricing"
      px="md"
      py={{
        base: "calc(var(--mantine-spacing-lg) * 2)",
        lg: "calc(var(--mantine-spacing-lg) * 3)",
      }}
    >
      <Reveal>
        <SectionHeader title={landing.Pricing.Title} />
      </Reveal>

      <Reveal className="max-w-pricing mx-auto mt-12 w-full md:mt-16" delay={0.1}>
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          <PricingCard
            action={
              <ButtonLink fullWidth href={hrefWebappLogin()} size="md" variant="default">
                {landing.GetStarted}
              </ButtonLink>
            }
            features={FREE_FEATURES}
            name={landing.Pricing.Free.Name}
            price={landing.Pricing.Free.Price}
            tagline={landing.Pricing.Free.Tagline}
          />
          <PricingCard
            action={
              <ButtonLink fullWidth href={hrefWebappLogin()} size="md" variant="primary">
                {landing.GetStarted}
              </ButtonLink>
            }
            featured
            features={PREMIUM_FEATURES}
            name={landing.Pricing.Premium.Name}
            period={landing.Pricing.Premium.Period}
            price={landing.Pricing.Premium.Price}
            tagline={landing.Pricing.Premium.Tagline}
          />
        </div>
      </Reveal>
    </Container>
  );
}
