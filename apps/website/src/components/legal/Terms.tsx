import { SUPPORT_EMAIL, WEBSITE_ROUTES } from "@bondery/helpers";
import { AnchorLink } from "@bondery/mantine-next";
import { Box, Divider, List, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { LEGAL_ENTITY } from "@/data/company";
import { LegalDocumentLayout } from "./shared/LegalDocumentLayout";

const LAST_UPDATED = "November 13, 2026";

function Section({ children, id, title }: { children: ReactNode; id: string; title: string }) {
  return (
    <>
      <Title id={id} mb="md" order={2}>
        {title}
      </Title>
      {children}
      <Divider my="xl" />
    </>
  );
}

function SubSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <>
      <Title mb="sm" mt="lg" order={3}>
        {title}
      </Title>
      {children}
    </>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <List listStyleType="disc" mb="lg" withPadding>
      {items.map((item) => (
        <List.Item key={String(item)}>{item}</List.Item>
      ))}
    </List>
  );
}

export function Terms() {
  return (
    <LegalDocumentLayout lastUpdated={LAST_UPDATED} title="Terms of Service">
      <Text mb="md">
        These Terms of Service (&quot;Terms&quot;) are an agreement between you and{" "}
        {LEGAL_ENTITY.legalName}, EUID: {LEGAL_ENTITY.euid} (&quot;Bondery,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;). They cover your use of Bondery: our website, web app,
        mobile app, browser extension, API, and the AI assistant connections we offer (together, the
        &quot;Services&quot;).
      </Text>
      <Text mb="md">
        Please read them. By creating an account, or by using the Services, you agree to these Terms
        and to our <AnchorLink href={WEBSITE_ROUTES.PRIVACY}>Privacy Policy</AnchorLink>. If you do
        not agree, please do not use Bondery.
      </Text>
      <Text mb="lg">
        If you have a question about these Terms, email{" "}
        <AnchorLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</AnchorLink>.
      </Text>

      <Divider my="xl" />

      <Title id="short-version" mb="md" order={2}>
        The short version
      </Title>
      <Text mb="md">
        This summary is here to help. It does not replace the rest of these Terms.
      </Text>
      <Bullets
        items={[
          "Your contacts are yours. We store them so the product works, and we do not sell them.",
          "You must be 16 or older to use Bondery.",
          "You are responsible for the contact information you store, including having a lawful reason to store it.",
          "The free plan stays free. Premium is $10 USD per month, with a 15-day trial, and you can cancel at any time.",
          "The software is open source under AGPL-3.0. You can self-host it under that license.",
          "We work hard to keep Bondery running, but we do not promise it will never break.",
          "Czech law applies, and Czech courts handle disputes.",
        ]}
      />

      <Divider my="xl" />

      <Section id="who-we-are" title="1. Who we are">
        <Text mb="md">
          Bondery is a personal relationship manager (PRM). It helps you keep track of the people
          you know, what you talked about, and when to reach out.
        </Text>
        <Text mb="md">The company behind Bondery is:</Text>
        <Box mb="lg" pl="md">
          <Text fw="bold">{LEGAL_ENTITY.legalName}</Text>
          <Text>
            {LEGAL_ENTITY.streetAddress}, {LEGAL_ENTITY.postalCode} {LEGAL_ENTITY.addressLocality},{" "}
            {LEGAL_ENTITY.addressCountryName}
          </Text>
          <Text>EUID: {LEGAL_ENTITY.euid}</Text>
          <Text>VAT ID: {LEGAL_ENTITY.vatId}</Text>
        </Box>
        <Text mb="lg">
          &quot;Bondery&quot; is our brand name. {LEGAL_ENTITY.legalName} is the company that enters
          into this agreement with you.
        </Text>
      </Section>

      <Section id="eligibility" title="2. Who can use Bondery">
        <Text mb="md">
          You must be at least 16 years old to use Bondery. If the law where you live sets a higher
          age for you to agree to a service like this on your own, you must meet that age.
        </Text>
        <Text mb="md">
          If you use Bondery for a company or another organization, you confirm that you are allowed
          to accept these Terms on its behalf. In that case, &quot;you&quot; means that
          organization.
        </Text>
        <Text mb="lg">
          You may hold one account. Do not create accounts to get around a suspension or to abuse a
          free plan.
        </Text>
      </Section>

      <Section id="accounts" title="3. Your account">
        <Text mb="md">
          You can sign in with an email address, or with GitHub or LinkedIn. When you use one of
          those providers, we receive only the details we need to create and run your account, such
          as your email address, name, and provider account ID. We never receive your password for
          those services.
        </Text>
        <Text mb="md">
          Keep your sign-in method secure. You are responsible for activity that happens under your
          account. Tell us right away if you think someone else has access to it.
        </Text>
        <Text mb="lg">
          Give us accurate information, and keep it current. We may need to contact you about your
          account, your subscription, or these Terms.
        </Text>
      </Section>

      <Section id="your-content" title="4. Your content and your contacts">
        <Text mb="md">
          You keep ownership of everything you put into Bondery: your notes, your contacts, the
          details you save, the photos, and the files you upload (&quot;Your Content&quot;).
        </Text>
        <SubSection title="a) The permission you give us">
          <Text mb="lg">
            You give us permission to store, copy, back up, send, and display Your Content, but only
            to run and improve the Services for you, and only as described in our Privacy Policy.
            This permission is worldwide, royalty-free, and limited to that purpose. It ends when
            you delete the content or your account, except for copies that remain in backups for a
            short time.
          </Text>
        </SubSection>
        <SubSection title="b) You are the controller for contact data">
          <Text mb="md">
            Bondery is built for storing information about other people. For that information, you
            are the data controller and we act as your data processor. This is the same relationship
            described in section 13 of our Privacy Policy.
          </Text>
          <Text mb="md">This means you are responsible for:</Text>
          <Bullets
            items={[
              "Having a lawful reason to store and use the information about your contacts.",
              "Telling people what you need to tell them, where the law requires it.",
              "Keeping that information accurate and up to date.",
              "Deleting information when you no longer have a reason to keep it.",
              "Answering requests from your contacts about their own information. If someone contacts us directly, we may forward the request to you.",
            ]}
          />
          <Text mb="lg">
            Please use Bondery for real personal and professional relationships. Do not use it to
            build a list of people you have no connection to, and do not use it to contact people in
            a way the law does not allow.
          </Text>
        </SubSection>
        <SubSection title="c) Imports and the browser extension">
          <Text mb="md">
            Bondery can import data from files you upload, such as a vCard, a LinkedIn export, or an
            Instagram export. The browser extension can read profile information from a page you
            open, and save it to your account when you ask it to.
          </Text>
          <Text mb="lg">
            You are responsible for how you collect that data. When you import from, or read from,
            another service such as LinkedIn or Instagram, you must respect that service&apos;s
            terms and the rights of the people whose information you save. We do not control those
            services, and we cannot promise that they allow every kind of import or read. You accept
            the risk of using those services with Bondery, including any restriction they place on
            your account.
          </Text>
        </SubSection>
      </Section>

      <Section id="acceptable-use" title="5. Acceptable use">
        <Text mb="md">You agree not to:</Text>
        <Bullets
          items={[
            "Break any law, or help someone else break one, while using Bondery.",
            "Store or share information about other people in a way that breaks their privacy rights or a duty of confidence you owe them.",
            "Use Bondery to harass, threaten, stalk, defame, or discriminate against anyone.",
            "Upload malware, or anything designed to damage or disrupt a system.",
            "Try to gain access to an account, a server, or data that is not yours.",
            "Probe, scan, or test the security of the Services without our written permission.",
            "Copy, scrape, or bulk-extract data from the Services, other than your own data.",
            "Resell Bondery, or offer it to others as your own product, without our written agreement.",
            "Overload our infrastructure, or interfere with other people's use of the Services.",
            "Use the Services to send spam or unsolicited bulk messages.",
          ]}
        />
        <Text mb="lg">
          If you find a security problem, please report it to{" "}
          <AnchorLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</AnchorLink> instead of
          exploiting it. We welcome good-faith reports.
        </Text>
      </Section>

      <Section id="plans-and-payment" title="6. Plans, trials, and payment">
        <SubSection title="a) Free plan">
          <Text mb="lg">
            You can use Bondery on the free plan, which includes the core features: contacts,
            activities, and reminders. The free plan does not expire, and we do not delete your
            account for inactivity alone.
          </Text>
        </SubSection>
        <SubSection title="b) Premium">
          <Text mb="md">
            Premium adds advanced features. It costs $10 USD per month. The features, the price, and
            any limits are listed on our website, and we keep that page up to date.
          </Text>
          <Text mb="md">
            New Premium subscriptions start with a 15-day trial. The trial is free. If you do not
            cancel before it ends, the subscription starts and the first payment is taken.
          </Text>
          <Text mb="lg">
            Premium renews automatically each month until you cancel. We take payment through
            Stripe, our payment provider. We never see your full card details.
          </Text>
        </SubSection>
        <SubSection title="c) Taxes">
          <Text mb="lg">
            The price shown may not include taxes. Where we are required to charge VAT or another
            tax, we add it at checkout, and you pay it. Prices can change. If a price changes, we
            tell you before it applies to you.
          </Text>
        </SubSection>
        <SubSection title="d) Cancelling and refunds">
          <Text mb="md">
            You can cancel at any time from the billing settings in the app. When you cancel,
            Premium stays active until the end of the period you already paid for. After that, your
            account moves to the free plan. We do not delete your data when you cancel.
          </Text>
          <Text mb="lg">
            Payments are not refundable except where the law requires it, or where we choose to
            refund. If you think you were charged in error, contact us and we will look into it.
          </Text>
        </SubSection>
        <SubSection title="e) Late or failed payment">
          <Text mb="lg">
            If a renewal payment fails, we may retry it and tell you about it. If payment keeps
            failing, we may move your account to the free plan. We will not delete your data just
            because a payment failed.
          </Text>
        </SubSection>
      </Section>

      <Section id="withdrawal-right" title="7. Your right to change your mind">
        <Text mb="md">
          If you are a consumer in the European Union, you normally have 14 days to withdraw from a
          new paid subscription without giving a reason. The 14 days start on the day you subscribe.
        </Text>
        <Text mb="md">
          When you subscribe and start using Premium straight away, you agree that the service
          starts during that 14-day period. You also acknowledge that once the service has started,
          you lose the right to withdraw, to the extent the law allows.
        </Text>
        <Text mb="lg">
          To withdraw, email{" "}
          <AnchorLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</AnchorLink> before the 14
          days end and tell us you want to withdraw. If you withdraw before Premium starts, we
          refund what you paid.
        </Text>
      </Section>

      <Section id="third-party" title="8. Other services and AI assistants">
        <Text mb="md">
          Bondery can connect to services we do not own. This includes GitHub and LinkedIn for
          sign-in, Stripe for payments, and AI assistants such as Claude or other MCP clients that
          you choose to connect to your account.
        </Text>
        <Text mb="md">
          When you connect another service, that service's own terms and privacy policy apply to it.
          We are not responsible for what it does, for its availability, or for changes it makes.
          You choose whether to connect it, and you can disconnect it at any time.
        </Text>
        <Text mb="md">
          The AI assistant features are optional. When you send a message to an assistant, your
          message and the contact details needed to answer it are sent to the provider for
          processing, as described in our Privacy Policy. We do not use your content to train
          models.
        </Text>
        <Text mb="lg">
          AI output can be wrong. Check anything important before you rely on it, especially dates,
          facts about a person, and anything you plan to send to someone else.
        </Text>
      </Section>

      <Section id="open-source" title="9. Open source and self-hosting">
        <Text mb="md">
          Bondery is open-source software, licensed under the GNU Affero General Public License
          version 3 (AGPL-3.0). That license governs your use of the source code. Nothing in these
          Terms limits the rights the AGPL-3.0 gives you.
        </Text>
        <Text mb="md">
          You can run Bondery yourself. If you do, you run your own copy, and you are the operator
          of it. These Terms and our Privacy Policy describe the service we operate. They do not
          apply to your own deployment, and you become responsible for your own legal obligations,
          including your own privacy policy, your own service providers, and your own backups.
        </Text>
        <Text mb="lg">
          We do not provide support for self-hosted deployments, though you are welcome to report
          bugs and take part in the project.
        </Text>
      </Section>

      <Section id="our-ip" title="10. Our intellectual property">
        <Text mb="md">
          Bondery's name, logo, and the design of the hosted service belong to us. We grant you a
          limited, personal, non-transferable, non-exclusive right to use the Services while you
          follow these Terms. All rights not granted to you stay with us.
        </Text>
        <Text mb="lg">
          Do not use our name or logo in a way that suggests we endorse you or your product, unless
          we agree to it in writing. Fair use of the name to refer to Bondery is fine.
        </Text>
      </Section>

      <Section id="availability" title="11. Availability and changes">
        <Text mb="md">
          We work to keep Bondery available and secure, but we do not promise that it will always be
          online or free of faults. Maintenance, updates, and problems outside our control can make
          it unavailable for a time.
        </Text>
        <Text mb="md">
          We improve Bondery continuously. We may add, change, or remove features. If a change
          significantly reduces what you get on a paid plan, we tell you in advance, and you may
          cancel.
        </Text>
        <Text mb="lg">
          Back up anything you cannot afford to lose. You can export your data at any time from the
          app.
        </Text>
      </Section>

      <Section id="termination" title="12. Ending this agreement">
        <SubSection title="a) You can leave at any time">
          <Text mb="lg">
            You can delete your account whenever you like, from the settings in the app. When you
            delete your account, your data is deleted as described in our Privacy Policy. Export
            anything you want to keep first.
          </Text>
        </SubSection>
        <SubSection title="b) We can suspend or end your access">
          <Text mb="md">
            We may suspend or close your account if you seriously or repeatedly break these Terms,
            if we are required to by law, or if keeping your account would put other people, us, or
            the Services at risk.
          </Text>
          <Text mb="lg">
            Except where the law prevents us, we tell you first and give you a chance to fix the
            problem. If we close your account and you have paid for time you will not get to use, we
            refund that unused time.
          </Text>
        </SubSection>
        <SubSection title="c) What survives">
          <Text mb="lg">
            Sections that by their nature should continue after the agreement ends, such as your
            content ownership, our intellectual property, disclaimers, liability limits, and
            governing law, continue to apply.
          </Text>
        </SubSection>
      </Section>

      <Section id="disclaimers" title="13. Disclaimers">
        <Text mb="md">
          We provide the Services with reasonable skill and care. Beyond that, and to the extent the
          law allows, the Services are provided &quot;as is&quot; and &quot;as available&quot;.
        </Text>
        <Text mb="md">We do not promise that:</Text>
        <Bullets
          items={[
            "The Services will be uninterrupted, timely, or free of errors.",
            "Every fault will be corrected.",
            "The Services will meet your particular expectations, beyond what we describe on our website.",
            "Information shown in the Services, including AI output, is always complete or accurate.",
          ]}
        />
        <Text mb="lg">
          We do not exclude or limit any warranty or right you have under mandatory law, including
          consumer protection law in your country.
        </Text>
      </Section>

      <Section id="liability" title="14. Limits on our liability">
        <Text mb="md">
          To the extent the law allows, we are not liable for indirect or consequential loss. This
          includes lost profit, lost business, lost opportunity, and loss of reputation. It also
          includes loss caused by your use of, or inability to use, the Services.
        </Text>
        <Text mb="md">
          Where we are liable, our total liability for all claims connected to the Services is
          limited to the greater of:
        </Text>
        <Bullets
          items={[
            "The amount you paid us in the 12 months before the event that caused the loss, or",
            "100 EUR.",
          ]}
        />
        <Text mb="lg">
          These limits do not apply to liability that cannot be limited by law. This includes
          liability for death or personal injury caused by us, for fraud, and for intent or gross
          negligence. If you are a consumer, your statutory rights are not affected by this section.
        </Text>
      </Section>

      <Section id="indemnity" title="15. Your responsibility to us">
        <Text mb="lg">
          If a third party brings a claim against us because of how you used the Services, because
          of content you stored, or because you broke these Terms or the law, you agree to cover our
          reasonable costs and losses from that claim. This does not apply where the claim results
          from something we did wrong. If you are a consumer, this section applies only to the
          extent the law allows.
        </Text>
      </Section>

      <Section id="changes" title="16. Changes to these Terms">
        <Text mb="md">
          We may update these Terms. When we do, we change the date at the top of this page. If the
          change is significant, we tell you in the app or by email before it takes effect.
        </Text>
        <Text mb="lg">
          If you keep using Bondery after a change takes effect, you accept the updated Terms. If
          you do not agree, you can stop using Bondery and delete your account. If the change
          affects a paid plan and you do not agree, you may cancel and we refund the unused part.
        </Text>
      </Section>

      <Section id="governing-law" title="17. Governing law and disputes">
        <Text mb="md">
          These Terms are governed by the law of Czechia. This does not remove the protection you
          get from mandatory rules in the country where you live as a consumer.
        </Text>
        <Text mb="md">
          If we cannot resolve a disagreement between us directly, the courts of Czechia have
          jurisdiction. For consumers, this means the courts in Brno, where we are based, unless the
          law gives you the right to go to a court where you live.
        </Text>
        <Text mb="lg">
          Before going to court, please write to{" "}
          <AnchorLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</AnchorLink> and tell us what
          the problem is. Most issues can be solved that way.
        </Text>
      </Section>

      <Section id="general" title="18. General">
        <Text mb="md">
          These Terms, together with our Privacy Policy, are the whole agreement between us about
          the Services. If any part of these Terms is found to be invalid, the rest stays in force.
        </Text>
        <Text mb="md">
          We may transfer our rights and obligations under these Terms to another company, for
          example if the business is sold. We will tell you if that happens, and it will not reduce
          your rights. You may not transfer your rights under these Terms to anyone else.
        </Text>
        <Text mb="lg">
          If we do not enforce a part of these Terms on one occasion, that does not mean we give up
          the right to enforce it later.
        </Text>
      </Section>

      <Section id="contact" title="19. Contact us">
        <Text mb="md">
          Questions about these Terms, your account, or your data are welcome at{" "}
          <AnchorLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</AnchorLink>.
        </Text>
        <Text mb="md">Our postal address is:</Text>
        <Box mb="lg" pl="md">
          <Text fw="bold">{LEGAL_ENTITY.legalName}</Text>
          <Text>
            {LEGAL_ENTITY.streetAddress}, {LEGAL_ENTITY.postalCode} {LEGAL_ENTITY.addressLocality},{" "}
            {LEGAL_ENTITY.addressCountryName}
          </Text>
        </Box>
        <Text mb="lg">
          If we cannot resolve a consumer complaint with you directly, you can contact the Czech
          Trade Inspection Authority (Česká obchodní inspekce), which handles out-of-court consumer
          disputes in Czechia.
        </Text>
      </Section>
    </LegalDocumentLayout>
  );
}
