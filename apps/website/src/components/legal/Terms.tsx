import { Divider, Text, Title } from "@mantine/core";
import { LegalDocumentLayout } from "./shared/LegalDocumentLayout";

export function Terms() {
  return (
    <LegalDocumentLayout lastUpdated="February 18, 2026" title="Terms of Service">
      <Text mb="lg">
        This Terms of Service document is currently in progress. We are publishing this draft page
        to provide transparency and will replace it with a complete legal text after final review.
      </Text>

      <Divider my="xl" />

      <Title id="status" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        1. Draft Status
      </Title>
      <Text mb="lg">
        This page is a preliminary placeholder and does not yet represent the final contractual
        terms for using Bondery services.
      </Text>

      <Divider my="xl" />

      <Title id="scope" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        2. Planned Coverage
      </Title>
      <Text mb="lg">
        The final version is expected to include acceptable use rules, account responsibilities,
        limitation of liability, termination, governing law, and support terms.
      </Text>

      <Divider my="xl" />

      <Title id="timeline" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        3. Publication Timeline
      </Title>
      <Text mb="lg">
        We are actively preparing the final legal text. Until then, please contact us if you need
        any clarification related to service usage or legal terms.
      </Text>

      <Divider my="xl" />

      <Title id="contact" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        4. Contact
      </Title>
      <Text mb="lg">For legal questions, contact us at team@usebondery.com.</Text>
    </LegalDocumentLayout>
  );
}
