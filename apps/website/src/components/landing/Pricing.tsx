import { ButtonLink } from "@bondery/mantine-next";
import { Container } from "@mantine/core";
import { hrefWebappLogin } from "@/lib/navigation/href/webapp";
import { Reveal } from "./features/Reveal";
import { SectionHeader } from "./features/SectionHeader";
import { PricingCard } from "./PricingCard";

const FREE_FEATURES = [
  "Unlimited contacts",
  "Interaction history",
  "Birthday and date reminders",
] as const;

const PREMIUM_FEATURES = [
  "AI Assistant",
  "Smart search",
  "Writing copilot",
  "Priority support",
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
        <SectionHeader title="Simple pricing" />
      </Reveal>

      <Reveal className="mx-auto mt-12 w-full max-w-[880px] md:mt-16" delay={0.1}>
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          <PricingCard
            action={
              <ButtonLink fullWidth href={hrefWebappLogin()} size="md" variant="default">
                Get started
              </ButtonLink>
            }
            features={FREE_FEATURES}
            name="Free"
            price="$0"
            tagline="All the core features."
          />
          <PricingCard
            action={
              <ButtonLink fullWidth href={hrefWebappLogin()} size="md" variant="primary">
                Get started
              </ButtonLink>
            }
            featured
            features={PREMIUM_FEATURES}
            name="Premium"
            period="/month"
            price="$10"
            tagline="For power users."
          />
        </div>
      </Reveal>
    </Container>
  );
}
