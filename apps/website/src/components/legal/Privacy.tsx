"use client";

import { AnchorLink } from "@bondery/mantine-next";
import { Box, Divider, List, Table, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { LegalDocumentLayout } from "./shared/LegalDocumentLayout";

// Types for data-driven sections
interface SectionProps {
  children: ReactNode;
  id: string;
  number: number;
  title: string;
}

// Third-party providers data
const subprocessors = [
  {
    location: "",
    name: "Vercel",
    notes: "",
    privacy: "https://vercel.com/legal/privacy-policy",
    useCase: "Website, webapp, and API hosting",
  },
  {
    location: "EU",
    name: "Supabase",
    notes: "",
    privacy: "https://supabase.com/privacy",
    useCase: "Authentication, database, file storage",
  },
  {
    location: "EU",
    name: "PostHog",
    notes: "",
    privacy: "https://posthog.com/privacy",
    useCase: "Product analytics",
  },
  {
    location: "EU",
    name: "Plunk",
    notes: "Feedback notifications, reminder digests, and contact sharing emails.",
    privacy: "https://www.useplunk.com/legal/privacy",
    useCase: "Transactional email",
  },
  {
    location: "US",
    name: "Anthropic",
    notes:
      "Used only when you send a message to the AI Assistant. Your message and any contact data retrieved to answer it are sent to Anthropic for processing and are not used to train their models.",
    privacy: "https://www.anthropic.com/legal/privacy",
    useCase: "AI Assistant",
  },
  {
    location: "",
    name: "Polar",
    notes: "Used when you subscribe to or manage a paid plan.",
    privacy: "https://polar.sh/legal/privacy",
    useCase: "Subscriptions and billing",
  },
  {
    location: "EU",
    name: "Mapy.com",
    notes:
      "Location strings from contacts and imports are sent to resolve coordinates and timezones.",
    privacy: "https://licence.mapy.cz/?doc=privacy",
    useCase: "Geocoding and timezone lookup",
  },
  {
    location: "",
    name: "Upstash",
    notes: "Transient request metadata (e.g. IP address) for rate limiting and sync notifications.",
    privacy: "https://upstash.com/trust/privacy.pdf",
    useCase: "Rate limiting and real-time sync",
  },
  {
    location: "",
    name: "OpenStreetMap",
    notes: "Map tiles are loaded directly in your browser when you use the map view.",
    privacy: "https://wiki.osmfoundation.org/wiki/Privacy_Policy",
    useCase: "Map tiles",
  },
];

// Reusable components
function _Section({ id, number, title, children }: SectionProps) {
  return (
    <>
      <Title id={id} mb="md" order={2}>
        {number}. {title}
      </Title>
      {children}
      <Divider my="xl" />
    </>
  );
}

function _SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Title mb="sm" mt="lg" order={3}>
        {title}
      </Title>
      {children}
    </>
  );
}

function _BulletList({ items }: { items: ReactNode[] }) {
  return (
    <List listStyleType="disc" mb="lg" withPadding>
      {items.map((item) => (
        <List.Item key={String(item)}>{item}</List.Item>
      ))}
    </List>
  );
}

export function Privacy() {
  return (
    <LegalDocumentLayout lastUpdated="July 8, 2026" title="Privacy Policy">
      <Text mb="lg">
        PixelDev s.r.o., IČ: 23476800 (&quot;PixelDev,&quot; &quot;Bondery,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;) respects the privacy of its users (&quot;User,&quot;
        &quot;your,&quot; or &quot;you&quot;). This Privacy Policy explains how we collect, use,
        disclose, and safeguard your information when you use Bondery&apos;s platform, websites, web
        application, browser extension, and API (together &quot;Services&quot;).
      </Text>

      <Text mb="lg">
        Please read this privacy policy carefully to understand our policies and practices regarding
        your information and how we will treat it. By accessing or using our Services, you agree to
        accept all the terms contained in this Privacy Policy and acknowledge and agree with the
        practices described herein.
      </Text>

      <Text mb="lg">
        If you do not agree with the terms of this privacy policy, please do not access or use our
        Services.
      </Text>

      <Text fw="bold" mb="xl">
        We do not sell your personal information, nor do we intend to do so.
      </Text>

      <Divider my="xl" />

      {/* Section 1 */}
      <Title id="introduction" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        1. Introduction
      </Title>
      <Text mb="md">
        Bondery is a personal relationship manager (PRM) and network management tool that helps you
        organize, track, and nurture your personal and professional relationships. Our Services
        include:
      </Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>
          <strong>Bondery Webapp</strong> – A web application for managing your contacts,
          relationships, activities, and interactions
        </List.Item>
        <List.Item>
          <strong>Bondery Browser Extension</strong> – A Chrome extension that helps you import
          contact information from social platforms
        </List.Item>
        <List.Item>
          <strong>Bondery Mobile App</strong> – A native iOS and Android application for managing
          your contacts, relationships, and activities, with offline sync support
        </List.Item>
        <List.Item>
          <strong>Bondery API</strong> – Backend services that power the webapp, extension, and
          mobile app
        </List.Item>
        <List.Item>
          <strong>Bondery Website</strong> – Our public marketing and informational website
        </List.Item>
      </List>
      <Text mb="lg">
        We collect and store only the information necessary to provide our Services. We are
        committed to protecting your privacy and being transparent about our data practices.
      </Text>

      <Divider my="xl" />

      {/* Section 2 */}
      <Title id="data-controller" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        2. Data Controller
      </Title>
      <Text mb="md">The data controller responsible for your personal data is:</Text>
      <Box mb="lg" pl="md">
        <Text fw="bold">PixelDev s.r.o.</Text>
        <Text>IČ: 23476800</Text>
        <Text>Bělehradská 858/23</Text>
        <Text>Prague 120 00</Text>
        <Text>Czech Republic</Text>
      </Box>

      <Divider my="xl" />

      {/* Section 3 */}
      <Title id="information-we-collect" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        3. Information We Collect
      </Title>

      <Title mb="sm" mt="lg" order={3}>
        a) Account Information
      </Title>
      <Text mb="lg">
        When you register for Bondery, we collect basic account information necessary to create and
        manage your account, such as your email address, authentication credentials, and any
        third-party login identifiers if you choose to sign in via OAuth providers.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        b) User Profile and Preferences
      </Title>
      <Text mb="lg">
        You may optionally provide profile information (such as your name and profile photo) and
        preferences (such as language and display settings) to personalize your experience.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        c) User-Generated Content
      </Title>
      <Text mb="md">
        The core function of Bondery is to help you manage your personal network. You may store
        various types of information about your contacts, relationships, activities, and
        interactions. This may include names, contact details, social media handles, notes, photos,
        dates, location information, and other data you choose to enter.
      </Text>
      <Text c="dimmed" fz="sm" mb="lg">
        <strong>Important:</strong> You are responsible for ensuring you have the appropriate legal
        basis to store information about other individuals in your Bondery account. We act as a data
        processor for this contact data on your behalf.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        d) Browser Extension Data
      </Title>
      <Text mb="lg">
        If you use the Bondery browser extension, it may extract publicly visible profile
        information from supported websites when you explicitly initiate an import action. This data
        is used to pre-fill contact forms in Bondery. The extension only activates when you click
        the Bondery button and does not automatically collect or transmit data.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        e) Technical and Log Data
      </Title>
      <Text mb="lg">
        We automatically collect certain technical information when you use our Services, including
        IP addresses, browser and device information, access timestamps, and server logs for
        security and debugging purposes.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        f) Analytics Data
      </Title>
      <Text mb="lg">
        We may use analytics tools to understand how users interact with our Services and to improve
        them. This may include page views, feature usage, session duration, and anonymized
        interaction data. You may be able to opt out of analytics tracking in your account settings
        where available.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        g) Feedback and Communications
      </Title>
      <Text mb="lg">
        If you submit feedback, contact us for support, or otherwise communicate with us, we collect
        the content of your communications and your contact information for response purposes.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        h) Information We Do NOT Collect
      </Title>
      <Text mb="lg">
        We do not process biometric data. We do not access your social media accounts directly — any
        browser extension functionality only reads publicly visible page content that you explicitly
        choose to import.
      </Text>

      <Divider my="xl" />

      {/* Section 4 */}
      <Title id="how-we-use-information" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        4. How We Use Your Data
      </Title>
      <Text mb="md">We use the information we collect to:</Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>
          <strong>Provide our Services</strong> – Create and manage your account, store and display
          your contacts and activities, sync data across your devices
        </List.Item>
        <List.Item>
          <strong>Authenticate you</strong> – Verify your identity and manage secure access to your
          account
        </List.Item>
        <List.Item>
          <strong>Improve our Services</strong> – Analyze usage patterns to fix bugs, improve
          features, and develop new functionality
        </List.Item>
        <List.Item>
          <strong>Communicate with you</strong> – Respond to your inquiries, send service-related
          notifications, and provide support
        </List.Item>
        <List.Item>
          <strong>Ensure security</strong> – Detect and prevent fraud, abuse, and unauthorized
          access
        </List.Item>
        <List.Item>
          <strong>Comply with legal obligations</strong> – Meet our legal and regulatory
          requirements
        </List.Item>
      </List>

      <Divider my="xl" />

      {/* Section 5 */}
      <Title id="legal-basis" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        5. Legal Basis for Processing
      </Title>
      <Text mb="lg">
        We process data only when we have a legal basis to do so—typically your consent, a
        contractual need, or a legitimate business interest. You may object to processing based on
        legitimate interests at any time by contacting us.
      </Text>

      <Divider my="xl" />

      {/* Section 6 */}
      <Title id="cookies" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        6. Cookies and Similar Technologies
      </Title>

      <Title mb="sm" mt="lg" order={3}>
        Essential Cookies/Storage
      </Title>
      <Text mb="md">We use essential cookies and local storage for:</Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>
          <strong>Authentication</strong> – Maintaining your logged-in session
        </List.Item>
        <List.Item>
          <strong>Preferences</strong> – Remembering your language and display settings
        </List.Item>
      </List>
      <Text mb="lg">
        These are necessary for the basic functioning of our Services and cannot be disabled.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        Analytics
      </Title>
      <Text mb="md">
        We may use analytics tools for product analytics. These tools may set cookies to:
      </Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>Distinguish unique users</List.Item>
        <List.Item>Track session information</List.Item>
        <List.Item>Remember opt-out preferences</List.Item>
      </List>
      <Text mb="lg">
        You can disable analytics tracking in your account settings where available.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        We Do NOT Use
      </Title>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>Advertising or tracking cookies</List.Item>
        <List.Item>Third-party marketing cookies</List.Item>
        <List.Item>Cross-site tracking technologies</List.Item>
      </List>

      <Divider my="xl" />

      {/* Section 7 */}
      <Title id="security" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        7. Security
      </Title>
      <Text mb="md">
        We use industry-standard safeguards (encryption, access controls, monitoring, security
        reviews) to protect your data.
      </Text>
      <Text mb="lg">
        Despite our efforts, no method of transmission over the internet or electronic storage is
        100% secure. We cannot guarantee absolute security.
      </Text>
      <Text mb="lg">
        You are responsible for securing your passwords and devices. That includes following best
        practices like using strong, unique passwords, logging out of shared devices and reporting
        any suspected unauthorized access immediately.
      </Text>

      <Divider my="xl" />

      {/* Section 8 */}
      <Title id="data-retention" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        8. Data Retention
      </Title>

      <Title mb="sm" mt="lg" order={3}>
        While Your Account is Active
      </Title>
      <Text mb="lg">
        We retain your data for as long as your account is active and as needed to provide you with
        our Services.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        After Account Deletion
      </Title>
      <Text mb="md">When you delete your account:</Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>
          <strong>Your data</strong> – All your personal data, contacts, activities, and uploaded
          files are deleted immediately
        </List.Item>
        <List.Item>
          <strong>Backups</strong> – Data in backups is purged within 30 days
        </List.Item>
        <List.Item>
          <strong>Logs</strong> – Server logs containing your IP address are retained for up to 90
          days for security purposes, then deleted or anonymized
        </List.Item>
      </List>

      <Title mb="sm" mt="lg" order={3}>
        Exceptions
      </Title>
      <Text mb="md">We may retain certain data longer if:</Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>Required by law or legal process</List.Item>
        <List.Item>Necessary to resolve disputes or enforce our agreements</List.Item>
        <List.Item>
          Needed for legitimate business purposes (in anonymized/aggregated form)
        </List.Item>
      </List>

      <Divider my="xl" />

      {/* Section 9 */}
      <Title id="disclosure" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        9. Disclosure of Personal Information
      </Title>
      <Text mb="lg">
        We do not sell, trade, or rent your personal information to third parties. We may share your
        information only in the following circumstances:
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        a) Service Providers (Subprocessors)
      </Title>
      <Text mb="lg">
        We share data with trusted third-party service providers who help us operate our Services
        (see Section 15 for the complete list). These providers are contractually bound to protect
        your data and use it only for the purposes we specify.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        b) Legal Requirements
      </Title>
      <Text mb="md">We may disclose your information if required to:</Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>Comply with applicable law, regulation, or legal process</List.Item>
        <List.Item>Respond to lawful requests from public authorities</List.Item>
        <List.Item>Protect our rights, privacy, safety, or property</List.Item>
        <List.Item>Enforce our Terms of Service</List.Item>
      </List>

      <Title mb="sm" mt="lg" order={3}>
        c) Business Transfers
      </Title>
      <Text mb="lg">
        If PixelDev is involved in a merger, acquisition, or sale of assets, your personal
        information may be transferred as part of that transaction. We will notify you of any such
        change and any choices you may have.
      </Text>

      <Title mb="sm" mt="lg" order={3}>
        d) With Your Consent
      </Title>
      <Text mb="lg">
        We may share your information for other purposes with your explicit consent.
      </Text>

      <Divider my="xl" />

      {/* Section 10 */}
      <Title id="international-transfers" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        10. International Data Transfers
      </Title>
      <Text mb="md">
        PixelDev is based in the Czech Republic (EU). Your data may be processed in the European
        Union and potentially in other countries where our service providers operate.
      </Text>
      <Text mb="md">
        When we transfer data outside the EEA, we ensure appropriate safeguards are in place, such
        as:
      </Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>EU Standard Contractual Clauses (SCCs)</List.Item>
        <List.Item>Adequacy decisions by the European Commission</List.Item>
        <List.Item>Other legally recognized transfer mechanisms</List.Item>
      </List>

      <Divider my="xl" />

      {/* Section 11 - Children */}
      <Title id="children" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        11. Children
      </Title>
      <Text mb="lg">
        Our Services are not intended for children under the age of 16. We do not knowingly collect
        personal information from children under 16. If you believe a child has provided us with
        personal information, please contact us immediately.
      </Text>

      <Divider my="xl" />

      {/* Section 12 */}
      <Title id="your-rights" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        12. Your Privacy Rights
      </Title>

      <Title mb="sm" mt="lg" order={3}>
        For All Users
      </Title>
      <Text mb="md">You have the right to:</Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>
          <strong>Access</strong> your personal data
        </List.Item>
        <List.Item>
          <strong>Correct</strong> inaccurate data
        </List.Item>
        <List.Item>
          <strong>Delete</strong> your account and data
        </List.Item>
        <List.Item>
          <strong>Export</strong> your data in a portable format
        </List.Item>
        <List.Item>
          <strong>Object</strong> to certain processing activities
        </List.Item>
      </List>

      <Title mb="sm" mt="lg" order={3}>
        For EEA/UK/Swiss Residents (GDPR Rights)
      </Title>
      <Text mb="md">In addition to the above, you have the right to:</Text>
      <List listStyleType="disc" mb="md" withPadding>
        <List.Item>
          <strong>Restrict processing</strong> of your personal data
        </List.Item>
        <List.Item>
          <strong>Withdraw consent</strong> where processing is based on consent
        </List.Item>
        <List.Item>
          <strong>Lodge a complaint</strong> with your local data protection authority
        </List.Item>
      </List>

      <Text mb="md">The lead supervisory authority for PixelDev is:</Text>
      <Box mb="lg" pl="md">
        <Text fw="bold">Úřad pro ochranu osobních údajů (ÚOOÚ)</Text>
        <Text>Czech Data Protection Authority</Text>
        <Text>Pplk. Sochora 27</Text>
        <Text>170 00 Praha 7</Text>
        <Text>Czech Republic</Text>
        <AnchorLink href="https://www.uoou.cz" target="_blank">
          https://www.uoou.cz
        </AnchorLink>
      </Box>

      <Title mb="sm" mt="lg" order={3}>
        Exercising Your Rights
      </Title>
      <Text mb="lg">
        To exercise any of these rights, please contact us at{" "}
        <AnchorLink href="mailto:team@usebondery.com">team@usebondery.com</AnchorLink>. We will
        respond to your request within 30 days (or within the timeframe required by applicable law).
      </Text>
      <Text mb="lg">
        We may need to verify your identity before processing your request. In some cases, we may
        not be able to fully comply with your request (for example, if it would affect the rights of
        others or if we have a legal obligation to retain certain data).
      </Text>

      <Divider my="xl" />

      {/* Section 13 */}
      <Title id="contact-data-responsibilities" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        13. Your Responsibilities for Contact Data
      </Title>
      <Text mb="md">
        Bondery allows you to store information about other people (your contacts). When you add
        contact information to Bondery, you are the data controller for that information, and we act
        as a data processor on your behalf.
      </Text>
      <Text mb="md">
        <strong>You are responsible for:</strong>
      </Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>
          Ensuring you have a lawful basis to store and process information about your contacts
        </List.Item>
        <List.Item>Keeping contact information accurate and up to date</List.Item>
        <List.Item>
          Respecting the privacy rights of the individuals whose information you store
        </List.Item>
        <List.Item>
          Deleting contact information when you no longer have a legitimate reason to keep it
        </List.Item>
      </List>
      <Text mb="lg">
        We recommend using Bondery only for managing your genuine personal or professional
        relationships.
      </Text>

      <Divider my="xl" />

      {/* Section 14 */}
      <Title id="third-party-links" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        14. Third-Party Links
      </Title>
      <Text mb="lg">
        We may include links to third-party websites or services in our Services. We have no control
        over the content, privacy policies, or practices of any third-party websites or services.
      </Text>
      <Text mb="lg">
        We recommend that you review the privacy policies of any third-party websites or services
        you visit through our links. We are not responsible or liable for the collection, use, or
        disclosure of your information by these third parties.
      </Text>

      <Divider my="xl" />

      {/* Section 15 */}
      <Title id="subprocessors" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        15. Third-Party Service Providers (Subprocessors)
      </Title>
      <Text mb="lg">
        Bondery uses the following third-party service providers for the provision of services as
        detailed under the Terms. Each provider is contractually obligated to protect your data and
        keep it confidential.
      </Text>

      <Table mb="xl" withColumnBorders withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Provider</Table.Th>
            <Table.Th>Use Case</Table.Th>
            <Table.Th>Notes</Table.Th>
            <Table.Th>Privacy Policy</Table.Th>
            <Table.Th>Location of Data</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {subprocessors.map((provider) => (
            <Table.Tr key={provider.name}>
              <Table.Td>{provider.name}</Table.Td>
              <Table.Td>{provider.useCase}</Table.Td>
              <Table.Td>{provider.notes || "—"}</Table.Td>
              <Table.Td>
                <AnchorLink href={provider.privacy} target="_blank">
                  {provider.privacy}
                </AnchorLink>
              </Table.Td>
              <Table.Td>{provider.location || "—"}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Divider my="xl" />

      {/* Section 16 */}
      <Title id="sign-in-providers" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        16. Sign-in Providers (Identity Providers)
      </Title>
      <Text mb="md">
        If you choose to sign in with <strong>GitHub</strong> or <strong>LinkedIn</strong>,
        authentication is handled by that provider. We receive only the information needed to create
        and manage your Bondery account (such as your email address, name, and provider user ID). We
        do not receive your password and do not control how these providers process your data during
        login.
      </Text>
      <Text mb="lg">
        Each provider&apos;s privacy policy applies to sign-in:{" "}
        <AnchorLink
          href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
          target="_blank"
        >
          GitHub Privacy Statement
        </AnchorLink>
        ,{" "}
        <AnchorLink href="https://www.linkedin.com/legal/privacy-policy" target="_blank">
          LinkedIn Privacy Policy
        </AnchorLink>
        .
      </Text>

      <Divider my="xl" />

      {/* Section 17 */}
      <Title id="changes" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        17. Changes to This Privacy Policy
      </Title>
      <Text mb="md">
        We may update this Privacy Policy from time to time. When we make material changes, we will:
      </Text>
      <List listStyleType="disc" mb="lg" withPadding>
        <List.Item>Update the &quot;Last Updated&quot; date at the top of this policy</List.Item>
        <List.Item>
          Notify you via email or through our Services (for significant changes)
        </List.Item>
      </List>
      <Text mb="lg">
        Your continued use of our Services after any changes indicates your acceptance of the
        updated Privacy Policy.
      </Text>

      <Divider my="xl" />

      {/* Section 18 */}
      <Title id="contact" mb="md" order={2} style={{ scrollMarginTop: 120 }}>
        18. Contact Us
      </Title>
      <Text mb="md">
        If you have any questions about this Privacy Policy or how we process your information and
        data, please email us at{" "}
        <AnchorLink href="mailto:team@usebondery.com" target="_blank">
          team@usebondery.com
        </AnchorLink>
        . We&apos;ll be happy to help!
      </Text>
      <Text mb="md">
        Or you can reach us by mail at our postal address:{" "}
        <AnchorLink href="https://mapy.com/s/fovafaduso" target="_blank">
          PixelDev s.r.o., Bělehradská 858/23, Prague 120 00, Czech Republic
        </AnchorLink>
        .
      </Text>
    </LegalDocumentLayout>
  );
}
