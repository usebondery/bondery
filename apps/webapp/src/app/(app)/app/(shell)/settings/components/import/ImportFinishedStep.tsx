"use client";

import { ModalFooter, ModalScrollLayout } from "@bondery/mantine-next";
import { Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCircleCheck, IconUsers } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface ImportFinishedStepProps {
  /** Secondary action. Closes the dialog and stays on the current page. */
  closeLabel: string;
  description?: string;
  onClose: () => void;
  /** Primary action. Opens the contacts list. */
  onViewContacts: () => void;
  /** Imported contacts table. Rendered in a scroll area above the buttons. */
  overview?: ReactNode;
  /** Count summary, such as count chips. */
  summary?: ReactNode;
  title: string;
  viewContactsLabel: string;
}

/** Last importer step. Shows what was imported and offers the contacts list. */
export function ImportFinishedStep({
  title,
  description,
  summary,
  overview,
  viewContactsLabel,
  closeLabel,
  onViewContacts,
  onClose,
}: ImportFinishedStepProps) {
  const footer = (
    <ModalFooter
      actionLabel={viewContactsLabel}
      actionLeftSection={<IconUsers size={16} />}
      cancelLabel={closeLabel}
      onAction={onViewContacts}
      onCancel={onClose}
    />
  );

  const header = (
    <Stack gap="sm">
      <Stack align="center" gap="sm" pt="sm">
        <ThemeIcon color="teal" radius="xl" size={64} variant="light">
          <IconCircleCheck size={36} stroke={1.5} />
        </ThemeIcon>
        <Title order={4} ta="center">
          {title}
        </Title>
      </Stack>

      {description ? (
        <Text c="dimmed" size="sm" ta="center">
          {description}
        </Text>
      ) : null}

      {summary}
    </Stack>
  );

  if (overview) {
    return (
      <ModalScrollLayout footer={footer} header={header}>
        {overview}
      </ModalScrollLayout>
    );
  }

  return (
    <Stack gap="md">
      {header}
      {footer}
    </Stack>
  );
}
