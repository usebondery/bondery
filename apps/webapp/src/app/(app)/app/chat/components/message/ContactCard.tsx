"use client";

import { PersonAvatar } from "@bondery/mantine-next";
import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { IconBriefcase, IconCalendar, IconLanguage, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";

interface ContactCardContact {
  appLink?: string;
  avatar?: string | null;
  emails?: Array<{ value: string }>;
  firstName?: string;
  fullName: string;
  headline?: string | null;
  id: string;
  language?: string | null;
  lastInteraction?: string | null;
  lastName?: string;
  location?: string | null;
  phones?: Array<{ prefix: string; value: string }>;
  tags?: string[] | Array<{ label: string; color?: string }>;
}

interface ContactCardProps {
  contact: ContactCardContact;
  detailed?: boolean;
}

export function ContactCard({ contact, detailed }: ContactCardProps) {
  const link = contact.appLink ?? `/app/person/${contact.id}`;

  const tags = (contact.tags ?? []).map((tag) => (typeof tag === "string" ? tag : tag.label));

  return (
    <Link
      href={link}
      style={{
        color: "inherit",
        display: "block",
        textDecoration: "none",
      }}
    >
      <Paper
        className="hover:bg-(--mantine-color-default-hover)"
        mb="xs"
        p="sm"
        radius="md"
        style={{
          cursor: "pointer",
          transition: "background-color 150ms ease",
        }}
        withBorder
      >
        <Group align="flex-start" gap="sm" wrap="nowrap">
          <PersonAvatar
            person={{
              avatar: contact.avatar ?? null,
              firstName: contact.firstName ?? contact.fullName.split(" ")[0] ?? "",
              id: contact.id,
              lastName: contact.lastName ?? null,
            }}
            size="md"
          />
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="sm">
              {contact.fullName}
            </Text>

            {contact.headline && (
              <Group gap={4} wrap="nowrap">
                <IconBriefcase size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <Text c="dimmed" lineClamp={1} size="xs">
                  {contact.headline}
                </Text>
              </Group>
            )}

            {contact.location && (
              <Group gap={4} wrap="nowrap">
                <IconMapPin size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <Text c="dimmed" lineClamp={1} size="xs">
                  {contact.location}
                </Text>
              </Group>
            )}

            {detailed && contact.language && (
              <Group gap={4} wrap="nowrap">
                <IconLanguage size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <Text c="dimmed" size="xs">
                  {contact.language}
                </Text>
              </Group>
            )}

            {contact.lastInteraction && (
              <Group gap={4} wrap="nowrap">
                <IconCalendar size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <Text c="dimmed" size="xs">
                  Last interaction: {new Date(contact.lastInteraction).toLocaleDateString()}
                </Text>
              </Group>
            )}

            {detailed && contact.phones && contact.phones.length > 0 && (
              <Text c="dimmed" size="xs">
                Phone: {contact.phones.map((p) => `${p.prefix}${p.value}`).join(", ")}
              </Text>
            )}

            {detailed && contact.emails && contact.emails.length > 0 && (
              <Text c="dimmed" size="xs">
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
                  <Text c="dimmed" size="xs">
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
