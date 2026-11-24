import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Container } from "@mantine/core";
import { FeatureBento } from "./features/FeatureBento";
import { PrivacyBand } from "./features/PrivacyBand";
import { SectionHeader } from "./features/SectionHeader";
import { LANDING_SECTION_IDS } from "./sectionIds";

/**
 * Landing page features: the feature tiles and the privacy promise.
 */
export function Features() {
  return (
    <section
      aria-labelledby="features-title"
      className="scroll-mt-header-sticky-bottom"
      id={LANDING_SECTION_IDS.features}
      style={{
        backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
      }}
    >
      <Container py={{ base: 64, md: 112 }} size="xl">
        <div className="flex flex-col gap-12 md:gap-16">
          <SectionHeader title={landing.Features.Title} titleId="features-title" />
          <FeatureBento />
          <PrivacyBand />
        </div>
      </Container>
    </section>
  );
}
