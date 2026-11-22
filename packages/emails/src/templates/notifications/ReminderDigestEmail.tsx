import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import { IMPORTANT_DATE_TYPE_META, WEBAPP_ROUTES } from "@bondery/helpers";
import type { JSX } from "react";
import { Column, Img, Link, Row, Section, Text } from "react-email";
import { defaultReminderDigestCopy, previewReminderDigestItems } from "#fixtures/default-copy.js";
import { clipEmailPreview, DEFAULT_APP_URL, type EmailDocumentProps } from "#shared/chrome.js";
import { EmailBody } from "#shared/EmailBody.js";
import { EmailWrapper } from "#shared/EmailWrapper.js";
import { EMAIL_MUTED, EMAIL_TEXT } from "#shared/email-styles.js";

const PATTERN_5C732B_RE = /\s+/;
const PATTERN_5C2F2B24_RE = /\/+$/;

function getInitials(name: string) {
  return name
    .trim()
    .split(PATTERN_5C732B_RE)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export interface ReminderDigestEmailItem {
  date: string;
  dateLabel: string;
  note: string | null;
  notifyDaysBefore: 1 | 3 | 7;
  notifyOn: string;
  personAvatar: string | null;
  personId: string;
  personName: string;
  remainingLabel: string;
  type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
  typeLabel: string;
}

export interface ReminderDigestEmailCopy {
  cta: string;
  dateTypes: Record<ReminderDigestEmailItem["type"], string>;
  dayMany: string;
  dayOne: string;
  description: string;
  headingMany: string;
  headingOne: string;
  preview: string;
  previewMore: string;
  reminderLine: string;
  whyReceiving: string;
}

export interface ReminderDigestEmailProps extends EmailDocumentProps {
  appOrigin?: string;
  copy?: ReminderDigestEmailCopy;
  formattedHeadingDate: string;
  reminders: ReminderDigestEmailItem[];
  targetDate: string;
  userId: string;
}

export default function ReminderDigestEmail({
  appOrigin = DEFAULT_APP_URL,
  chrome,
  copy = defaultReminderDigestCopy,
  dir,
  formattedHeadingDate = "January 1",
  lang,
  manageNotificationsUrl = `${DEFAULT_APP_URL}${WEBAPP_ROUTES.SETTINGS}`,
  reminders = previewReminderDigestItems,
  targetDate: _targetDate = "2026-01-01",
  title,
  websiteUrl,
}: ReminderDigestEmailProps): JSX.Element {
  const count = reminders.length;
  const first = reminders[0];
  const heading =
    count === 1 ? copy.headingOne : copy.headingMany.replace("{{count}}", String(count));
  const description = copy.description.replace("{{headingDate}}", formattedHeadingDate);
  const preview = clipEmailPreview(
    first
      ? (count > 1 ? copy.previewMore : copy.preview)
          .replace("{{firstPersonName}}", first.personName)
          .replace("{{firstTypeLabel}}", first.typeLabel)
          .replace("{{firstRemainingLabel}}", first.remainingLabel)
          .replace("{{remainingCount}}", String(count - 1))
      : description,
  );
  const homeUrl = `${appOrigin.replace(PATTERN_5C2F2B24_RE, "")}${WEBAPP_ROUTES.HOME}`;

  return (
    <EmailWrapper
      chrome={chrome}
      dir={dir}
      lang={lang}
      manageNotificationsUrl={manageNotificationsUrl}
      preview={preview}
      title={title ?? heading}
      websiteUrl={websiteUrl}
    >
      <EmailBody
        cta={{ href: homeUrl, label: copy.cta }}
        description={description}
        heading={heading}
        notes={copy.whyReceiving}
      >
        {reminders.map((reminder) => {
          const personUrl = `${appOrigin.replace(PATTERN_5C2F2B24_RE, "")}${WEBAPP_ROUTES.PERSON}/${encodeURIComponent(reminder.personId)}`;
          const dateMeta = IMPORTANT_DATE_TYPE_META[reminder.type];
          const personInitials = getInitials(reminder.personName) || "?";
          const reminderLine = copy.reminderLine
            .replace("{{emoji}}", dateMeta.emoji)
            .replace("{{typeLabel}}", reminder.typeLabel)
            .replace("{{remainingLabel}}", reminder.remainingLabel)
            .replace("{{dateLabel}}", reminder.dateLabel);

          return (
            <Section
              key={`${reminder.personId}-${reminder.type}-${reminder.date}`}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                margin: "0 0 12px",
                overflow: "hidden",
              }}
            >
              <Row>
                <Column
                  align="center"
                  style={{ backgroundColor: BRAND_PRIMARY_COLOR, padding: "12px 0" }}
                  width="72"
                >
                  {reminder.personAvatar ? (
                    <Img
                      alt=""
                      height="40"
                      src={reminder.personAvatar}
                      style={{
                        border: "1px solid #ffffff",
                        borderRadius: "9999px",
                        height: "40px",
                        objectFit: "cover",
                        width: "40px",
                      }}
                      width="40"
                    />
                  ) : (
                    <Text
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #ffffff",
                        borderRadius: "9999px",
                        color: BRAND_PRIMARY_COLOR,
                        fontSize: "12px",
                        fontWeight: 700,
                        height: "40px",
                        lineHeight: "40px",
                        margin: 0,
                        textAlign: "center",
                        width: "40px",
                      }}
                    >
                      {personInitials}
                    </Text>
                  )}
                </Column>
                <Column style={{ padding: "8px 12px" }}>
                  <Link
                    href={personUrl}
                    style={{
                      color: EMAIL_TEXT,
                      display: "inline-block",
                      fontSize: "16px",
                      fontWeight: 700,
                      margin: "0 0 4px",
                      textDecoration: "underline",
                    }}
                  >
                    {reminder.personName}
                  </Link>
                  <Text
                    style={{ color: EMAIL_TEXT, fontSize: "16px", lineHeight: "24px", margin: 0 }}
                  >
                    {reminderLine}
                  </Text>
                  {reminder.note ? (
                    <Text
                      style={{
                        color: EMAIL_MUTED,
                        fontSize: "14px",
                        lineHeight: "20px",
                        margin: "4px 0 0",
                      }}
                    >
                      {reminder.note}
                    </Text>
                  ) : null}
                </Column>
              </Row>
            </Section>
          );
        })}
      </EmailBody>
    </EmailWrapper>
  );
}
