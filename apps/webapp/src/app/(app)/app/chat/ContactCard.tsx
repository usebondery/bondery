"use client";

import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import {
  IconMapPin,
  IconBriefcase,
  IconLanguage,
  IconCalendar,
} from "@tabler/icons-react";
import Link from "next/link";
import { PersonAvatar } from "@bondery/mantine-next";

interface ContactCardContact {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  headline?: string | null;
  location?: string | null;
  language?: string | null;
  lastInteraction?: string | null;
  tags?: string[] | Array<{ label: string; color?: string }>;
  appLink?: string;
  phones?: Array<{ prefix: string; value: string }>;
  emails?: Array<{ value: string }>;
}

interface ContactCardProps {
  contact: ContactCardContact;
  detailed?: boolean;
}

export function ContactCard({ contact, detailed }: ContactCardProps) {
  const link = contact.appLink ?? `/app/person/${contact.id}`;

  const tags = (contact.tags ?? []).map((tag) =>
    typeof tag === "string" ? tag : tag.label,
  );

  return (
    <Link
      href={link}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <Paper
        p="sm"
        radius="md"
        withBorder
        mb="xs"
        style={{
          cursor: "pointer",
          transition: "background-color 150ms ease",
        }}
        className="hover:bg-(--mantine-color-default-hover)"
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <PersonAvatar
            person={{
              id: contact.id,
              firstName:
                contact.firstName ?? contact.fullName.split(" ")[0] ?? "",
              lastName: contact.lastName ?? null,
              avatar: contact.avatar ?? null,
            }}
            size="md"
          />
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="sm">
              {contact.fullName}
            </Text>

            {contact.headline && (
              <Group gap={4} wrap="nowrap">
                <IconBriefcase
                  size={14}
                  style={{ flexShrink: 0, opacity: 0.6 }}
                />
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {contact.headline}
                </Text>
              </Group>
            )}

            {contact.location && (
              <Group gap={4} wrap="nowrap">
                <IconMapPin size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {contact.location}
                </Text>
              </Group>
            )}

            {detailed && contact.language && (
              <Group gap={4} wrap="nowrap">
                <IconLanguage
                  size={14}
                  style={{ flexShrink: 0, opacity: 0.6 }}
                />
                <Text size="xs" c="dimmed">
                  {contact.language}
                </Text>
              </Group>
            )}

            {contact.lastInteraction && (
              <Group gap={4} wrap="nowrap">
                <IconCalendar
                  size={14}
                  style={{ flexShrink: 0, opacity: 0.6 }}
                />
                <Text size="xs" c="dimmed">
                  Last interaction:{" "}
                  {new Date(contact.lastInteraction).toLocaleDateString()}
                </Text>
              </Group>
            )}

            {detailed && contact.phones && contact.phones.length > 0 && (
              <Text size="xs" c="dimmed">
                Phone:{" "}
                {contact.phones.map((p) => `${p.prefix}${p.value}`).join(", ")}
              </Text>
            )}

            {detailed && contact.emails && contact.emails.length > 0 && (
              <Text size="xs" c="dimmed">
                Email: {contact.emails.map((e) => e.value).join(", ")}
              </Text>
            )}

            {tags.length > 0 && (
              <Group gap={4} mt={2}>
                {tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} size="xs" variant="light">
                    {tag}
                  </Badge>
                ))}
                {tags.length > 5 && (
                  <Text size="xs" c="dimmed">
                    +{tags.length - 5}
                  </Text>
                )}
              </Group>
            )}
          </Stack>
        </Group>
      </Paper>
    </Link>
  );
}
