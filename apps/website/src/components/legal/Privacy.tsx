"use client";

import { Box, Divider, List, Table, Text, Title } from "@mantine/core";
import { AnchorLink } from "@bondery/mantine-next";
import { type ReactNode } from "react";
import { LegalDocumentLayout } from "./shared/LegalDocumentLayout";

// Types for data-driven sections
interface SectionProps {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}

// Third-party providers data
const subprocessors = [
  {
    name: "Vercel",
    useCase: "Website and webapp hosting",
    privacy: "https://vercel.com/legal/privacy-policy",
    location: "",
  },
  {
    name: "Supabase",
    useCase: "Authentication, database, file storage",
    privacy: "https://supabase.com/privacy",
    location: "EU",
  },
  {
    name: "PostHog",
    useCase: "Product analytics",
    privacy: "https://posthog.com/privacy",
    location: "EU",
  },
  {
    name: "Plunk",
    useCase: "Emails",
    privacy: "https://www.useplunk.com/legal/privacy",
    location: "EU",
  },
  {
    name: "OpenFreeMap",
    useCase: "Maps",
    privacy: "https://openfreemap.org/privacy",
    location: "",
  },
];

// Reusable components
function Section({ id, number, title, children }: SectionProps) {
  return (
    <>
      <Title order={2} mb="md" id={id}>
        {number}. {title}
      </Title>
      {children}
      <Divider my="xl" />
    </>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Title order={3} mt="lg" mb="sm">
        {title}
      </Title>
      {children}
    </>
  );
}

function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <List mb="lg" withPadding listStyleType="disc">
      {items.map((item, index) => (
        <List.Item key={index}>{item}</List.Item>
      ))}
    </List>
  );
}

export function Privacy() {
  return (
    <LegalDocumentLayout title="Privacy Policy" lastUpdated="February 11, 2026">
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
      <Title order={2} mb="md" id="introduction" style={{ scrollMarginTop: 120 }}>
        1. Introduction
      </Title>
      <Text mb="md">
        Bondery is a personal relationship manager (PRM) and network management tool that helps you
        organize, track, and nurture your personal and professional relationships. Our Services
        include:
      </Text>
      <List mb="lg" withPadding listStyleType="disc">
        <List.Item>
          <strong>Bondery Webapp</strong> – A web application for managing your contacts,
          relationships, activities, and interactions
        </List.Item>
        <List.Item>
          <strong>Bondery Browser Extension</strong> – A Chrome extension that helps you import
          contact information from social platforms
        </List.Item>
        <List.Item>
          <strong>Bondery API</strong> – Backend services that power the webapp and extension
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
      <Title order={2} mb="md" id="data-controller" style={{ scrollMarginTop: 120 }}>
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
      <Title order={2} mb="md" id="information-we-collect" style={{ scrollMarginTop: 120 }}>
        3. Information We Collect
      </Title>

      <Title order={3} mt="lg" mb="sm">
        a) Account Information
      </Title>
      <Text mb="lg">
        When you register for Bondery, we collect basic account information necessary to create and
        manage your account, such as your email address, authentication credentials, and any
        third-party login identifiers if you choose to sign in via OAuth providers.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        b) User Profile and Preferences
      </Title>
      <Text mb="lg">
        You may optionally provide profile information (such as your name and profile photo) and
        preferences (such as language and display settings) to personalize your experience.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        c) User-Generated Content
      </Title>
      <Text mb="md">
        The core function of Bondery is to help you manage your personal network. You may store
        various types of information about your contacts, relationships, activities, and
        interactions. This may include names, contact details, social media handles, notes, photos,
        dates, location information, and other data you choose to enter.
      </Text>
      <Text mb="lg" c="dimmed" fz="sm">
        <strong>Important:</strong> You are responsible for ensuring you have the appropriate legal
        basis to store information about other individuals in your Bondery account. We act as a data
        processor for this contact data on your behalf.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        d) Browser Extension Data
      </Title>
      <Text mb="lg">
        If you use the Bondery browser extension, it may extract publicly visible profile
        information from supported websites when you explicitly initiate an import action. This data
        is used to pre-fill contact forms in Bondery. The extension only activates when you click
        the Bondery button and does not automatically collect or transmit data.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        e) Technical and Log Data
      </Title>
      <Text mb="lg">
        We automatically collect certain technical information when you use our Services, including
        IP addresses, browser and device information, access timestamps, and server logs for
        security and debugging purposes.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        f) Analytics Data
      </Title>
      <Text mb="lg">
        We may use analytics tools to understand how users interact with our Services and to improve
        them. This may include page views, feature usage, session duration, and anonymized
        interaction data. You may be able to opt out of analytics tracking in your account settings
        where available.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        g) Feedback and Communications
      </Title>
      <Text mb="lg">
        If you submit feedback, contact us for support, or otherwise communicate with us, we collect
        the content of your communications and your contact information for response purposes.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        h) Information We Do NOT Collect
      </Title>
      <Text mb="lg">
        We do not process biometric data. We do not access your social media accounts directly — any
        browser extension functionality only reads publicly visible page content that you explicitly
        choose to import.
      </Text>

      <Divider my="xl" />

      {/* Section 4 */}
      <Title order={2} mb="md" id="how-we-use-information" style={{ scrollMarginTop: 120 }}>
        4. How We Use Your Data
      </Title>
      <Text mb="md">We use the information we collect to:</Text>
      <List mb="lg" withPadding listStyleType="disc">
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
      <Title order={2} mb="md" id="legal-basis" style={{ scrollMarginTop: 120 }}>
        5. Legal Basis for Processing
      </Title>
      <Text mb="lg">
        We process data only when we have a legal basis to do so—typically your consent, a
        contractual need, or a legitimate business interest. You may object to processing based on
        legitimate interests at any time by contacting us.
      </Text>

      <Divider my="xl" />

      {/* Section 6 */}
      <Title order={2} mb="md" id="cookies" style={{ scrollMarginTop: 120 }}>
        6. Cookies and Similar Technologies
      </Title>

      <Title order={3} mt="lg" mb="sm">
        Essential Cookies/Storage
      </Title>
      <Text mb="md">We use essential cookies and local storage for:</Text>
      <List mb="lg" withPadding listStyleType="disc">
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

      <Title order={3} mt="lg" mb="sm">
        Analytics
      </Title>
      <Text mb="md">
        We may use analytics tools for product analytics. These tools may set cookies to:
      </Text>
      <List mb="lg" withPadding listStyleType="disc">
        <List.Item>Distinguish unique users</List.Item>
        <List.Item>Track session information</List.Item>
        <List.Item>Remember opt-out preferences</List.Item>
      </List>
      <Text mb="lg">
        You can disable analytics tracking in your account settings where available.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        We Do NOT Use
      </Title>
      <List mb="lg" withPadding listStyleType="disc">
        <List.Item>Advertising or tracking cookies</List.Item>
        <List.Item>Third-party marketing cookies</List.Item>
        <List.Item>Cross-site tracking technologies</List.Item>
      </List>

      <Divider my="xl" />

      {/* Section 7 */}
      <Title order={2} mb="md" id="security" style={{ scrollMarginTop: 120 }}>
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
      <Title order={2} mb="md" id="data-retention" style={{ scrollMarginTop: 120 }}>
        8. Data Retention
      </Title>

      <Title order={3} mt="lg" mb="sm">
        While Your Account is Active
      </Title>
      <Text mb="lg">
        We retain your data for as long as your account is active and as needed to provide you with
        our Services.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        After Account Deletion
      </Title>
      <Text mb="md">When you delete your account:</Text>
      <List mb="lg" withPadding listStyleType="disc">
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

      <Title order={3} mt="lg" mb="sm">
        Exceptions
      </Title>
      <Text mb="md">We may retain certain data longer if:</Text>
      <List mb="lg" withPadding listStyleType="disc">
        <List.Item>Required by law or legal process</List.Item>
        <List.Item>Necessary to resolve disputes or enforce our agreements</List.Item>
        <List.Item>
          Needed for legitimate business purposes (in anonymized/aggregated form)
        </List.Item>
      </List>

      <Divider my="xl" />

      {/* Section 9 */}
      <Title order={2} mb="md" id="disclosure" style={{ scrollMarginTop: 120 }}>
        9. Disclosure of Personal Information
      </Title>
      <Text mb="lg">
        We do not sell, trade, or rent your personal information to third parties. We may share your
        information only in the following circumstances:
      </Text>

      <Title order={3} mt="lg" mb="sm">
        a) Service Providers (Subprocessors)
      </Title>
      <Text mb="lg">
        We share data with trusted third-party service providers who help us operate our Services
        (see Section 15 for the complete list). These providers are contractually bound to protect
        your data and use it only for the purposes we specify.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        b) Legal Requirements
      </Title>
      <Text mb="md">We may disclose your information if required to:</Text>
      <List mb="lg" withPadding listStyleType="disc">
        <List.Item>Comply with applicable law, regulation, or legal process</List.Item>
        <List.Item>Respond to lawful requests from public authorities</List.Item>
        <List.Item>Protect our rights, privacy, safety, or property</List.Item>
        <List.Item>Enforce our Terms of Service</List.Item>
      </List>

      <Title order={3} mt="lg" mb="sm">
        c) Business Transfers
      </Title>
      <Text mb="lg">
        If PixelDev is involved in a merger, acquisition, or sale of assets, your personal
        information may be transferred as part of that transaction. We will notify you of any such
        change and any choices you may have.
      </Text>

      <Title order={3} mt="lg" mb="sm">
        d) With Your Consent
      </Title>
      <Text mb="lg">
        We may share your information for other purposes with your explicit consent.
      </Text>

      <Divider my="xl" />

      {/* Section 10 */}
      <Title order={2} mb="md" id="international-transfers" style={{ scrollMarginTop: 120 }}>
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
      <List mb="lg" withPadding listStyleType="disc">
        <List.Item>EU Standard Contractual Clauses (SCCs)</List.Item>
        <List.Item>Adequacy decisions by the European Commission</List.Item>
        <List.Item>Other legally recognized transfer mechanisms</List.Item>
      </List>

      <Divider my="xl" />

      {/* Section 11 - Children */}
      <Title order={2} mb="md" id="children" style={{ scrollMarginTop: 120 }}>
        11. Children
      </Title>
      <Text mb="lg">
        Our Services are not intended for children under the age of 16. We do not knowingly collect
        personal information from children under 16. If you believe a child has provided us with
        personal information, please contact us immediately.
      </Text>

      <Divider my="xl" />

      {/* Section 12 */}
      <Title order={2} mb="md" id="your-rights" style={{ scrollMarginTop: 120 }}>
        12. Your Privacy Rights
      </Title>

      <Title order={3} mt="lg" mb="sm">
        For All Users
      </Title>
      <Text mb="md">You have the right to:</Text>
      <List mb="lg" withPadding listStyleType="disc">
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

      <Title order={3} mt="lg" mb="sm">
        For EEA/UK/Swiss Residents (GDPR Rights)
      </Title>
      <Text mb="md">In addition to the above, you have the right to:</Text>
      <List mb="md" withPadding listStyleType="disc">
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

      <Title order={3} mt="lg" mb="sm">
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
      <Title order={2} mb="md" id="contact-data-responsibilities" style={{ scrollMarginTop: 120 }}>
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
      <List mb="lg" withPadding listStyleType="disc">
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
      <Title order={2} mb="md" id="third-party-links" style={{ scrollMarginTop: 120 }}>
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
      <Title order={2} mb="md" id="subprocessors" style={{ scrollMarginTop: 120 }}>
        15. Third-Party Service Providers (Subprocessors)
      </Title>
      <Text mb="lg">
        Bondery uses the following third-party service providers for the provision of services as
        detailed under the Terms. Each provider is contractually obligated to protect your data and
        keep it confidential.
      </Text>

      <Table mb="xl" withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Provider</Table.Th>
            <Table.Th>Use Case</Table.Th>
            <Table.Th>Privacy Policy</Table.Th>
            <Table.Th>Location of Data</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {subprocessors.map((provider) => (
            <Table.Tr key={provider.name}>
              <Table.Td>{provider.name}</Table.Td>
              <Table.Td>{provider.useCase}</Table.Td>
              <Table.Td>
                <AnchorLink href={provider.privacy} target="_blank">
                  {provider.privacy}
                </AnchorLink>
              </Table.Td>
              <Table.Td>{provider.location}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Divider my="xl" />

      {/* Section 16 */}
      <Title order={2} mb="md" id="changes" style={{ scrollMarginTop: 120 }}>
        16. Changes to This Privacy Policy
      </Title>
      <Text mb="md">
        We may update this Privacy Policy from time to time. When we make material changes, we will:
      </Text>
      <List mb="lg" withPadding listStyleType="disc">
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

      {/* Section 17 */}
      <Title order={2} mb="md" id="contact" style={{ scrollMarginTop: 120 }}>
        17. Contact Us
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
