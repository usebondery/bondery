import { SUPPORT_EMAIL, WEBSITE_ROUTES } from "@bondery/helpers";
import { AnchorLink } from "@bondery/mantine-next";
import { Divider, Text, Title } from "@mantine/core";
import { LegalDocumentLayout } from "./shared/LegalDocumentLayout";

export function Security() {
  return (
    <LegalDocumentLayout lastUpdated="August 31, 2026" title="Security">
      <Text mb="lg">This page explains how to report a security issue in Bondery.</Text>

      <Divider my="xl" />

      <Title id="report" mb="md" order={2}>
        1. How to report
      </Title>
      <Text mb="lg">
        Email <AnchorLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</AnchorLink> with a
        description of the issue and the steps to reproduce it.
      </Text>

      <Divider my="xl" />

      <Title id="encryption" mb="md" order={2}>
        2. Encryption
      </Title>
      <Text mb="lg">
        You can encrypt your report or email with our{" "}
        <AnchorLink href="/.well-known/pgp-key.txt">PGP public key</AnchorLink>.
      </Text>

      <Divider my="xl" />

      <Title id="privacy" mb="md" order={2}>
        3. Privacy
      </Title>
      <Text mb="lg">
        How we handle personal data is described in our{" "}
        <AnchorLink href={WEBSITE_ROUTES.PRIVACY}>Privacy Policy</AnchorLink>.
      </Text>
    </LegalDocumentLayout>
  );
}
