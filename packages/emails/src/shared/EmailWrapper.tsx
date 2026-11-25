import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import { BonderyLogotypeBlack } from "@bondery/branding/react";
import { formatLegalAddressLine, LEGAL_ENTITY, WEBSITE_ROUTES } from "@bondery/helpers";
import type { ReactElement, ReactNode } from "react";
import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Link,
  Preview,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "react-email";
import {
  clipEmailPreview,
  DEFAULT_WEBSITE_URL,
  defaultEmailChromeCopy,
  type EmailChromeCopy,
  type EmailDocumentProps,
} from "#shared/chrome.js";
import {
  chromeLinkStyle,
  EMAIL_CONTAINER_MAX_WIDTH,
  EMAIL_PAGE_BG,
  footerTextStyle,
} from "#shared/email-styles.js";
import { interpolateNamedLinks } from "#shared/interpolate-named-links.js";

const PATTERN_5C2F2B24_RE = /\/+$/u;

function joinUrl(origin: string, path: string): string {
  return `${origin.replace(PATTERN_5C2F2B24_RE, "")}${path}`;
}

function EmailFooter({
  chrome,
  docsHref,
  manageNotificationsUrl,
  showHelp,
  supportHref,
}: {
  chrome: EmailChromeCopy;
  docsHref: string;
  manageNotificationsUrl?: string;
  showHelp: boolean;
  supportHref: string;
}) {
  return (
    <Section style={{ borderTop: "1px solid #e5e7eb", marginTop: "32px", paddingTop: "16px" }}>
      {showHelp ? (
        <Text style={footerTextStyle}>
          {interpolateNamedLinks(
            chrome.help,
            {
              documentation: { href: docsHref, label: chrome.documentation },
              support: { href: supportHref, label: chrome.support },
            },
            chromeLinkStyle,
          )}
        </Text>
      ) : (
        <Text style={footerTextStyle}>{chrome.internalNote}</Text>
      )}
      {manageNotificationsUrl ? (
        <Text style={footerTextStyle}>
          <Link href={manageNotificationsUrl} style={chromeLinkStyle}>
            {chrome.manageNotifications}
          </Link>
        </Text>
      ) : null}
    </Section>
  );
}

export function EmailWrapper({
  children,
  chrome = defaultEmailChromeCopy,
  dir = "ltr",
  lang = "en",
  manageNotificationsUrl,
  preview,
  showHelp = true,
  showLegalEntity = false,
  title,
  websiteUrl = DEFAULT_WEBSITE_URL,
}: EmailDocumentProps & {
  children: ReactNode;
  preview: string;
}): ReactElement {
  const origin = websiteUrl.replace(PATTERN_5C2F2B24_RE, "");
  const supportHref = joinUrl(origin, WEBSITE_ROUTES.CONTACT);
  const docsHref = joinUrl(origin, WEBSITE_ROUTES.DOCS);
  const clippedPreview = clipEmailPreview(preview);
  const documentTitle = title?.trim() || clippedPreview;
  const legalAddress = formatLegalAddressLine();

  return (
    <Html dir={dir} lang={lang}>
      <Head>
        <title>{documentTitle}</title>
        <Font
          fallbackFontFamily="sans-serif"
          fontFamily="Lexend"
          fontStyle="normal"
          fontWeight={400}
          webFont={{
            format: "woff2",
            url: "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap",
          }}
        />
      </Head>
      <Preview useTitleTag={false}>{clippedPreview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: BRAND_PRIMARY_COLOR,
              },
            },
          },
        }}
      >
        <Body style={{ backgroundColor: EMAIL_PAGE_BG, margin: 0, padding: 0 }}>
          <Container
            className="mx-auto px-9"
            style={{
              backgroundColor: EMAIL_PAGE_BG,
              maxWidth: EMAIL_CONTAINER_MAX_WIDTH,
            }}
          >
            <Section className="my-9 text-center">
              <Link
                href={origin}
                style={{ display: "inline-block", textDecoration: "none" }}
                title={chrome.logoAlt}
              >
                <BonderyLogotypeBlack aria-hidden height={48} width={160} />
              </Link>
            </Section>

            {children}

            <EmailFooter
              chrome={chrome}
              docsHref={docsHref}
              manageNotificationsUrl={manageNotificationsUrl}
              showHelp={showHelp}
              supportHref={supportHref}
            />

            {showLegalEntity ? (
              <>
                <Text style={{ ...footerTextStyle, margin: "16px 0 0" }}>
                  {LEGAL_ENTITY.legalName}
                </Text>
                <Text style={{ ...footerTextStyle, margin: 0 }}>{legalAddress}</Text>
              </>
            ) : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
