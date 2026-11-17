import { Container } from "@mantine/core";
import { FeatureBento } from "./features/FeatureBento";
import { PrivacyBand } from "./features/PrivacyBand";
import { SectionHeader } from "./features/SectionHeader";

/**
 * Landing page features: the feature tiles and the privacy promise.
 */
export function Features() {
  return (
    <section
      aria-labelledby="features-title"
      className="scroll-mt-[var(--site-header-sticky-bottom)]"
      id="features"
      style={{
        backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
      }}
    >
      <Container py={{ base: 64, md: 112 }} size="xl">
        <div className="flex flex-col gap-12 md:gap-16">
          <SectionHeader
            title="Everything you need to build stronger bonds"
            titleId="features-title"
          />
          <FeatureBento />
          <PrivacyBand />
        </div>
      </Container>
    </section>
  );
}
