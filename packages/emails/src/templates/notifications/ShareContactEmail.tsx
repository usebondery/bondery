import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import type { JSX, ReactNode } from "react";
import { Column, Img, Link, Row, Section, Text } from "react-email";
import { defaultShareContactCopy } from "#fixtures/default-copy.js";
import { clipEmailPreview, type EmailDocumentProps } from "#shared/chrome.js";
import { EmailBody } from "#shared/EmailBody.js";
import { EmailWrapper } from "#shared/EmailWrapper.js";
import { EMAIL_MUTED, EMAIL_TEXT } from "#shared/email-styles.js";

const PATTERN_5C732B_RE = /\s+/u;

interface ShareContactEmailPhone {
  prefix?: string;
  type?: string;
  value: string;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "0 0 12px" }}>
      <Text
        style={{
          color: EMAIL_MUTED,
          fontSize: "14px",
          fontWeight: 600,
          lineHeight: "20px",
          margin: "0 0 4px",
        }}
      >
        {label}
      </Text>
      {children}
    </Section>
  );
}

function getInitials(name: string | undefined): string {
  return (name ?? "")
    .trim()
    .split(PATTERN_5C732B_RE)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function AvatarDisplay({ avatarUrl, name }: { avatarUrl?: string; name: string }) {
  if (avatarUrl) {
    return (
      <Img
        alt=""
        height="56"
        src={avatarUrl}
        style={{ borderRadius: "9999px", objectFit: "cover" }}
        width="56"
      />
    );
  }

  return (
    <Section
      style={{
        backgroundColor: `${BRAND_PRIMARY_COLOR}1a`,
        borderRadius: "9999px",
        height: "56px",
        lineHeight: "56px",
        textAlign: "center",
        width: "56px",
      }}
    >
      <Text style={{ color: BRAND_PRIMARY_COLOR, fontSize: "14px", fontWeight: 600, margin: 0 }}>
        {getInitials(name) || "?"}
      </Text>
    </Section>
  );
}

function toTelHref(prefix: string | undefined, value: string): string {
  const dialable = `${prefix ?? ""}${value}`.replace(/[^\d+]/gu, "");
  return `tel:${dialable}`;
}

function previewFromMessage(message: string | undefined, fallback: string): string {
  const trimmed = message?.trim();
  if (!trimmed) {
    return clipEmailPreview(fallback);
  }

  return clipEmailPreview(trimmed);
}

const PREVIEW_EMAILS: ShareContactEmailEntry[] = [{ type: "work", value: "jane@example.com" }];
const PREVIEW_IMPORTANT_DATES: ShareContactEmailDate[] = [
  { date: "March 15", label: "Birthday", type: "birthday" },
];
const PREVIEW_PHONES: ShareContactEmailPhone[] = [
  { prefix: "+1", type: "mobile", value: "555 010 2030" },
];

export default function ShareContactEmail({
  addresses,
  chrome,
  contactAvatarUrl,
  contactName = "Jane Doe",
  copy = defaultShareContactCopy,
  dir,
  emails = PREVIEW_EMAILS,
  facebook,
  headline,
  importantDates = PREVIEW_IMPORTANT_DATES,
  instagram,
  lang,
  linkedin = "jane-doe",
  location = "Prague, Czechia",
  message,
  notes = "Met at a conference last year.",
  phones = PREVIEW_PHONES,
  recipientEmail: _recipientEmail = "friend@example.com",
  senderAvatarUrl: _senderAvatarUrl,
  senderEmail = "alex@example.com",
  senderName = "Alex",
  signal,
  title,
  website = "https://example.com",
  websiteUrl,
  whatsapp,
}: ShareContactEmailProps): JSX.Element {
  const customMessage = message?.trim();
  const resolvedHeadline = headline?.trim();
  const preview = previewFromMessage(customMessage, copy.previewFallback);
  const description = copy.description.replace("{{senderName}}", senderName);
  const footerNotes = copy.footerNotes.replace("{{senderName}}", senderName);
  const hasPhoneOrEmail = (phones?.length ?? 0) > 0 || (emails?.length ?? 0) > 0;
  const replyCta = hasPhoneOrEmail
    ? undefined
    : {
        href: `mailto:${senderEmail}`,
        label: copy.replyCta.replace("{{senderName}}", senderName),
      };

  return (
    <EmailWrapper
      chrome={chrome}
      dir={dir}
      lang={lang}
      preview={preview}
      title={title ?? contactName}
      websiteUrl={websiteUrl}
    >
      <EmailBody cta={replyCta} description={description} heading={contactName} notes={footerNotes}>
        {customMessage ? (
          <Section
            style={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              margin: "0 0 16px",
              padding: "16px",
            }}
          >
            <Text
              style={{
                color: EMAIL_TEXT,
                fontSize: "16px",
                fontStyle: "italic",
                lineHeight: "24px",
                margin: 0,
              }}
            >
              “{customMessage}”
            </Text>
          </Section>
        ) : null}

        <Section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            margin: "0 0 16px",
            padding: "16px",
          }}
        >
          <Row>
            <Column align="left" width="68">
              <AvatarDisplay avatarUrl={contactAvatarUrl} name={contactName} />
            </Column>
            <Column>
              <Text
                style={{ color: EMAIL_TEXT, fontSize: "16px", fontWeight: 600, margin: "0 0 4px" }}
              >
                {contactName}
              </Text>
              {resolvedHeadline ? (
                <Text
                  style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}
                >
                  {resolvedHeadline}
                </Text>
              ) : null}
            </Column>
          </Row>
        </Section>

        {phones && phones.length > 0 ? (
          <InfoRow label={copy.labels.phone}>
            {phones.map((phone) => (
              <Link
                href={toTelHref(phone.prefix, phone.value)}
                key={`${phone.prefix ?? ""}-${phone.value}`}
                style={{
                  color: BRAND_PRIMARY_COLOR,
                  display: "block",
                  fontSize: "16px",
                  lineHeight: "24px",
                }}
              >
                {phone.prefix ? `${phone.prefix} ` : ""}
                {phone.value}
                {phone.type ? ` (${phone.type})` : ""}
              </Link>
            ))}
          </InfoRow>
        ) : null}

        {emails && emails.length > 0 ? (
          <InfoRow label={copy.labels.email}>
            {emails.map((email) => (
              <Link
                href={`mailto:${email.value}`}
                key={email.value}
                style={{
                  color: BRAND_PRIMARY_COLOR,
                  display: "block",
                  fontSize: "16px",
                  lineHeight: "24px",
                }}
              >
                {email.value}
                {email.type ? ` (${email.type})` : ""}
              </Link>
            ))}
          </InfoRow>
        ) : null}

        {location ? (
          <InfoRow label={copy.labels.location}>
            <Text style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}>
              {location}
            </Text>
          </InfoRow>
        ) : null}

        {addresses && addresses.length > 0 ? (
          <InfoRow label={copy.labels.address}>
            {addresses.map((addr) =>
              addr.formatted ? (
                <Text
                  key={addr.formatted}
                  style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}
                >
                  {addr.formatted}
                </Text>
              ) : null,
            )}
          </InfoRow>
        ) : null}

        {linkedin ? (
          <InfoRow label={copy.labels.linkedin}>
            <Link
              href={`https://linkedin.com/in/${linkedin}`}
              style={{ color: BRAND_PRIMARY_COLOR, fontSize: "16px" }}
            >
              {linkedin}
            </Link>
          </InfoRow>
        ) : null}

        {instagram ? (
          <InfoRow label={copy.labels.instagram}>
            <Link
              href={`https://instagram.com/${instagram}`}
              style={{ color: BRAND_PRIMARY_COLOR, fontSize: "16px" }}
            >
              @{instagram}
            </Link>
          </InfoRow>
        ) : null}

        {facebook ? (
          <InfoRow label={copy.labels.facebook}>
            <Link
              href={`https://facebook.com/${facebook}`}
              style={{ color: BRAND_PRIMARY_COLOR, fontSize: "16px" }}
            >
              {facebook}
            </Link>
          </InfoRow>
        ) : null}

        {website ? (
          <InfoRow label={copy.labels.website}>
            <Link href={website} style={{ color: BRAND_PRIMARY_COLOR, fontSize: "16px" }}>
              {website}
            </Link>
          </InfoRow>
        ) : null}

        {whatsapp ? (
          <InfoRow label={copy.labels.whatsapp}>
            <Text style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}>
              {whatsapp}
            </Text>
          </InfoRow>
        ) : null}

        {signal ? (
          <InfoRow label={copy.labels.signal}>
            <Text style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}>
              {signal}
            </Text>
          </InfoRow>
        ) : null}

        {notes ? (
          <InfoRow label={copy.labels.notes}>
            <Text style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}>
              {notes}
            </Text>
          </InfoRow>
        ) : null}

        {importantDates && importantDates.length > 0 ? (
          <InfoRow label={copy.labels.importantDates}>
            {importantDates.map((d) => (
              <Text
                key={`${d.label}-${d.date}`}
                style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}
              >
                {copy.importantDateLine
                  .replace("{{label}}", d.label)
                  .replace("{{date}}", d.date)
                  .replace("{{type}}", d.type)}
              </Text>
            ))}
          </InfoRow>
        ) : null}
      </EmailBody>
    </EmailWrapper>
  );
}

export type { ShareContactEmailPhone };

export interface ShareContactEmailEntry {
  type?: string;
  value: string;
}

export interface ShareContactEmailAddress {
  formatted?: string;
}

export interface ShareContactEmailDate {
  date: string;
  label: string;
  type: string;
}

export interface ShareContactEmailCopy {
  description: string;
  footerNotes: string;
  importantDateLine: string;
  labels: {
    phone: string;
    email: string;
    location: string;
    address: string;
    linkedin: string;
    instagram: string;
    facebook: string;
    website: string;
    whatsapp: string;
    signal: string;
    notes: string;
    importantDates: string;
  };
  previewFallback: string;
  replyCta: string;
}

export interface ShareContactEmailProps extends EmailDocumentProps {
  addresses?: ShareContactEmailAddress[];
  contactAvatarUrl?: string;
  contactName: string;
  copy?: ShareContactEmailCopy;
  emails?: ShareContactEmailEntry[];
  facebook?: string;
  headline?: string;
  importantDates?: ShareContactEmailDate[];
  instagram?: string;
  linkedin?: string;
  location?: string;
  message?: string;
  notes?: string;
  phones?: ShareContactEmailPhone[];
  recipientEmail: string;
  senderAvatarUrl?: string;
  senderEmail: string;
  senderName: string;
  signal?: string;
  website?: string;
  whatsapp?: string;
}
