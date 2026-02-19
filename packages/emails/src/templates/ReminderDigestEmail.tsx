import {
  Body,
  Column,
  Container,
  Heading,
  Img,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { EmailWrapper } from "../shared/EmailWrapper.js";
import { IMPORTANT_EVENT_TYPE_META } from "@bondery/helpers";
import * as React from "react";

export interface ReminderDigestEmailItem {
  personId: string;
  personName: string;
  personAvatar: string | null;
  eventType: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
  eventDate: string;
  notifyOn: string;
  notifyDaysBefore: 1 | 3 | 7;
  note: string | null;
}

export interface ReminderDigestEmailProps {
  userId: string;
  targetDate: string;
  reminders: ReminderDigestEmailItem[];
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

function formatEventDate(dateValue: string) {
  const parsedDate = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTargetDate(dateValue: string) {
  const parsedDate = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getDaysRemaining(targetDate: string, eventDate: string) {
  const target = new Date(`${targetDate}T00:00:00Z`);
  const event = new Date(`${eventDate}T00:00:00Z`);

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
      <Body className="bg-gray-50">
        <Container className="mx-auto mt-4 rounded-lg bg-white p-6 shadow-sm">
          <Heading className="mb-1 text-md font-bold text-gray-900">
            Bondery reminders for {headingDate}
          </Heading>
          <Text className="mb-4 text-sm text-gray-700">
            You have {reminders.length} reminder{reminders.length === 1 ? "" : "s"}:
          </Text>

          {reminders.map((reminder) => {
            const personUrl = `https://app.usebondery.com/app/person/${encodeURIComponent(reminder.personId)}`;
            const eventMeta = IMPORTANT_EVENT_TYPE_META[reminder.eventType];
            const daysRemaining = getDaysRemaining(targetDate, reminder.eventDate);
            const remainingLabel =
              daysRemaining === null
                ? `${reminder.notifyDaysBefore} day${reminder.notifyDaysBefore === 1 ? "" : "s"}`
                : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
            const personInitials = getInitials(reminder.personName) || "?";
            const eventDateLabel = formatEventDate(reminder.eventDate);

            return (
              <Section
                key={`${reminder.personId}-${reminder.eventType}-${reminder.eventDate}`}
                className="mb-3 border border-gray-200 bg-white"
                style={{ borderRadius: "12px", overflow: "hidden" }}
              >
                <Row>
                  <Column align="center" width="72" className="bg-brand py-3">
                    {reminder.personAvatar ? (
                      <Img
                        src={reminder.personAvatar}
                        alt={`${reminder.personName} avatar`}
                        width="40"
                        height="40"
                        className="border border-white"
                        style={{
                          borderRadius: "9999px",
                          width: "40px",
                          height: "40px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Text
                        className="m-0 border border-white bg-white text-xs font-bold text-brand"
                        style={{
                          borderRadius: "9999px",
                          width: "40px",
                          height: "40px",
                          lineHeight: "40px",
                          textAlign: "center",
                        }}
                      >
                        {personInitials}
                      </Text>
                    )}
                  </Column>
                  <Column className="px-3 py-2">
                    <Link
                      href={personUrl}
                      className="mt-0 mb-1 text-sm font-bold text-gray-900 underline"
                    >
                      {reminder.personName}
                    </Link>
                    <Text className="m-0 text-sm text-gray-700">
                      {eventMeta.emoji} <strong>{eventMeta.label}</strong> is coming up in{" "}
                      <strong>{remainingLabel}</strong> on {eventDateLabel}.
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
      </Body>
    </EmailWrapper>
  );
}
