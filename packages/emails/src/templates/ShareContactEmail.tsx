import type * as React from "react";
import { Column, Container, Heading, Hr, Img, Link, Row, Section, Text } from "react-email";
import { EmailWrapper } from "#shared/EmailWrapper.js";

export interface ShareContactEmailPhone {
  prefix?: string;
  type?: string;
  value: string;
}

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

export interface ShareContactEmailProps {
  addresses?: ShareContactEmailAddress[];
  contactAvatarUrl?: string;
  contactName: string;
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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Section className="mb-3">
      <Text className="mb-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </Text>
      <div>{children}</div>
    </Section>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function AvatarDisplay({ avatarUrl, name }: { avatarUrl?: string; name: string }) {
  if (avatarUrl) {
    return (
      <Img
        alt={name}
        className="rounded-full object-cover"
        height="56"
        src={avatarUrl}
        width="56"
      />
    );
  }

  return (
    <Section
      className="h-14 w-14 rounded-full bg-brand/10 text-center"
      style={{ lineHeight: "56px" }}
    >
      <Text className="m-0 text-sm font-semibold text-brand">{getInitials(name) || "?"}</Text>
    </Section>
  );
}

export default function ShareContactEmail({
  senderName,
  senderAvatarUrl,
  message,
  contactName,
  contactAvatarUrl,
  headline,
  phones,
  emails,
  addresses,
  location,
  linkedin,
  instagram,
  facebook,
  website,
  whatsapp,
  signal,
  notes,
  importantDates,
}: ShareContactEmailProps) {
  const previewText = `${senderName} shared a contact with you • ${contactName}`;
  const senderMessage = message?.trim() || "Shared this contact with you via Bondery.";
  const resolvedHeadline = headline?.trim() || "No headline";

  return (
    <EmailWrapper preview={previewText}>
      <Container className="mx-auto mb-4 rounded-lg bg-white p-6 shadow-sm">
        <Heading className="mb-4 text-lg font-bold text-gray-900">Contact shared with you</Heading>

        <Section className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Row>
            <Column align="left" width="68">
              <AvatarDisplay avatarUrl={senderAvatarUrl} name={senderName} />
            </Column>
            <Column>
              <Text className="mt-0 mb-1 text-sm font-semibold text-gray-900">{senderName}</Text>
              <Text className="m-0 text-sm italic text-gray-600">
                &ldquo;{senderMessage}&rdquo;
              </Text>
            </Column>
          </Row>
        </Section>

        <Section className="mb-4 rounded-lg border border-brand/30 bg-brand/5 p-4">
          <Row>
            <Column align="left" width="68">
              <AvatarDisplay avatarUrl={contactAvatarUrl} name={contactName} />
            </Column>
            <Column>
              <Text className="mt-0 mb-1 text-sm font-semibold text-gray-900">{contactName}</Text>
              <Text className="m-0 text-sm text-gray-700">💼 {resolvedHeadline}</Text>
            </Column>
          </Row>
        </Section>

        <Hr className="my-4 border-gray-200" />

        {phones && phones.length > 0 && (
          <InfoRow label="Phone">
            {phones.map((phone) => (
              <Text
                className="m-0 text-sm text-gray-900"
                key={`${phone.prefix ?? ""}-${phone.value}`}
              >
                {phone.prefix ? `${phone.prefix} ` : ""}
                {phone.value}
                {phone.type ? ` (${phone.type})` : ""}
              </Text>
            ))}
          </InfoRow>
        )}

        {emails && emails.length > 0 && (
          <InfoRow label="Email">
            {emails.map((email) => (
              <Link
                className="block text-sm text-brand"
                href={`mailto:${email.value}`}
                key={email.value}
              >
                {email.value}
                {email.type ? ` (${email.type})` : ""}
              </Link>
            ))}
          </InfoRow>
        )}

        {location && (
          <InfoRow label="Location">
            <Text className="m-0 text-sm text-gray-900">{location}</Text>
          </InfoRow>
        )}

        {addresses && addresses.length > 0 && (
          <InfoRow label="Address">
            {addresses.map((addr) =>
              addr.formatted ? (
                <Text className="m-0 text-sm text-gray-900" key={addr.formatted}>
                  {addr.formatted}
                </Text>
              ) : null,
            )}
          </InfoRow>
        )}

        {linkedin && (
          <InfoRow label="LinkedIn">
            <Link className="text-sm text-brand" href={`https://linkedin.com/in/${linkedin}`}>
              {linkedin}
            </Link>
          </InfoRow>
        )}

        {instagram && (
          <InfoRow label="Instagram">
            <Link className="text-sm text-brand" href={`https://instagram.com/${instagram}`}>
              @{instagram}
            </Link>
          </InfoRow>
        )}

        {facebook && (
          <InfoRow label="Facebook">
            <Link className="text-sm text-brand" href={`https://facebook.com/${facebook}`}>
              {facebook}
            </Link>
          </InfoRow>
        )}

        {website && (
          <InfoRow label="Website">
            <Link className="text-sm text-brand" href={website}>
              {website}
            </Link>
          </InfoRow>
        )}

        {whatsapp && (
          <InfoRow label="WhatsApp">
            <Text className="m-0 text-sm text-gray-900">{whatsapp}</Text>
          </InfoRow>
        )}

        {signal && (
          <InfoRow label="Signal">
            <Text className="m-0 text-sm text-gray-900">{signal}</Text>
          </InfoRow>
        )}

        {notes && (
          <InfoRow label="Notes">
            <Text className="m-0 text-sm text-gray-700">{notes}</Text>
          </InfoRow>
        )}

        {importantDates && importantDates.length > 0 && (
          <InfoRow label="Important dates">
            {importantDates.map((d) => (
              <Text className="m-0 text-sm text-gray-900" key={`${d.label}-${d.date}`}>
                {d.label}: {d.date} ({d.type})
              </Text>
            ))}
          </InfoRow>
        )}
      </Container>
    </EmailWrapper>
  );
}
