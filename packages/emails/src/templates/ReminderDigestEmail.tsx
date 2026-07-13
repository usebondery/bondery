import { IMPORTANT_DATE_TYPE_META } from "@bondery/helpers";
import { Column, Container, Heading, Img, Link, Row, Section, Text } from "react-email";
import { EmailWrapper } from "#shared/EmailWrapper.js";

export interface ReminderDigestEmailItem {
  date: string;
  note: string | null;
  notifyDaysBefore: 1 | 3 | 7;
  notifyOn: string;
  personAvatar: string | null;
  personId: string;
  personName: string;
  type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
}

export interface ReminderDigestEmailProps {
  reminders: ReminderDigestEmailItem[];
  targetDate: string;
  userId: string;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDateLabel(dateValue: string) {
  const parsedDate = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  return parsedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

function formatTargetDate(dateValue: string) {
  const parsedDate = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  return parsedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function getDaysRemaining(targetDate: string, date: string) {
  const target = new Date(`${targetDate}T00:00:00Z`);
  const event = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(target.getTime()) || Number.isNaN(event.getTime())) {
    return null;
  }

  const millisecondsInDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((event.getTime() - target.getTime()) / millisecondsInDay));
}

export default function ReminderDigestEmail({ targetDate, reminders }: ReminderDigestEmailProps) {
  const previewText = `You have ${reminders.length} reminder${reminders.length === 1 ? "" : "s"} for ${targetDate}`;
  const headingDate = formatTargetDate(targetDate);

  return (
    <EmailWrapper preview={previewText}>
      <Container className="mx-auto mb-4 rounded-lg bg-white p-6 shadow-sm">
        <Heading className="mb-1 text-md font-bold text-gray-900">
          Bondery reminders for {headingDate}
        </Heading>
        <Text className="mb-4 text-sm text-gray-700">
          You have {reminders.length} reminder
          {reminders.length === 1 ? "" : "s"}:
        </Text>

        {reminders.map((reminder) => {
          const personUrl = `https://app.usebondery.com/app/person/${encodeURIComponent(reminder.personId)}`;
          const dateMeta = IMPORTANT_DATE_TYPE_META[reminder.type];
          const daysRemaining = getDaysRemaining(targetDate, reminder.date);
          const remainingLabel =
            daysRemaining === null
              ? `${reminder.notifyDaysBefore} day${reminder.notifyDaysBefore === 1 ? "" : "s"}`
              : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
          const personInitials = getInitials(reminder.personName) || "?";
          const dateLabel = formatDateLabel(reminder.date);

          return (
            <Section
              className="mb-3 border border-gray-200 bg-white"
              key={`${reminder.personId}-${reminder.type}-${reminder.date}`}
              style={{ borderRadius: "12px", overflow: "hidden" }}
            >
              <Row>
                <Column align="center" className="bg-brand py-3" width="72">
                  {reminder.personAvatar ? (
                    <Img
                      alt={`${reminder.personName} avatar`}
                      className="border border-white"
                      height="40"
                      src={reminder.personAvatar}
                      style={{
                        borderRadius: "9999px",
                        height: "40px",
                        objectFit: "cover",
                        width: "40px",
                      }}
                      width="40"
                    />
                  ) : (
                    <Text
                      className="m-0 border border-white bg-white text-xs font-bold text-brand"
                      style={{
                        borderRadius: "9999px",
                        height: "40px",
                        lineHeight: "40px",
                        textAlign: "center",
                        width: "40px",
                      }}
                    >
                      {personInitials}
                    </Text>
                  )}
                </Column>
                <Column className="px-3 py-2">
                  <Link
                    className="mt-0 mb-1 text-sm font-bold text-gray-900 underline"
                    href={personUrl}
                  >
                    {reminder.personName}
                  </Link>
                  <Text className="m-0 text-sm text-gray-700">
                    {dateMeta.emoji} <strong>{dateMeta.label}</strong> is coming up in{" "}
                    <strong>{remainingLabel}</strong> on {dateLabel}.
                  </Text>
                  {reminder.note ? (
                    <Text className="mt-1 mb-0 text-xs text-gray-600">{reminder.note}</Text>
                  ) : null}
                </Column>
              </Row>
            </Section>
          );
        })}
      </Container>
    </EmailWrapper>
  );
}
