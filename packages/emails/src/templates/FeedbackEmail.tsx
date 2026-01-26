import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { EmailWrapper } from "../shared/EmailWrapper.js";
import * as React from "react";

export interface FeedbackEmailProps {
  userEmail: string;
  userId: string;
  npsScore: number;
  npsReason?: string;
  generalFeedback?: string;
  timestamp: string;
}

export default function FeedbackEmail({
  userEmail,
  userId,
  npsScore,
  npsReason,
  generalFeedback,
  timestamp,
}: FeedbackEmailProps) {
  const previewText = `New feedback from ${userEmail} - NPS Score: ${npsScore}`;

  return (
    <EmailWrapper preview={previewText}>
      <Body className="bg-gray-50 ">
        <Container className="mx-auto mt-4 rounded-lg bg-white p-6 shadow-sm">
          <Heading className="mb-8 text-md font-bold text-gray-900">New Feedback Received</Heading>

          <Section className="mb-4 rounded-lg bg-gray-50 p-4">
            <Text className="mb-1 text-sm font-semibold text-gray-700">User Email:</Text>
            <Text className="text-sm text-gray-900">{userEmail}</Text>
          </Section>

          <Section className="mb-4 rounded-lg bg-gray-50 p-4">
            <Text className="mb-1 text-sm font-semibold text-gray-700">User ID:</Text>
            <Text className="text-sm font-mono text-gray-600">{userId}</Text>
          </Section>

          <Section className="mb-4 rounded-lg bg-brand/10 p-4">
            <Text className="text-sm font-semibold text-brand">NPS Score:</Text>
            <Text className="text-sm font-bold text-brand">{npsScore} / 10</Text>
          </Section>
          <Section className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-gray-900">
              Why did they pick this score?
            </Text>
            <Text className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              {npsReason || "(Not provided)"}
            </Text>
          </Section>

          <Section className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-gray-900">General Feedback:</Text>
            <Text className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              {generalFeedback || "(Not provided)"}
            </Text>
          </Section>

          <Text className="text-xs text-gray-500">Submitted at: {timestamp}</Text>
        </Container>
      </Body>
    </EmailWrapper>
  );
}
