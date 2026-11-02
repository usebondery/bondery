"use client";

import type { ChatToolKind } from "@bondery/schemas";
import { Box, Button, Group, Loader, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";

/**
 * Tool steps above an assistant answer.
 *
 * Reads are grouped under one line once the answer has text. Writes stay as
 * individual receipts, because they changed the address book.
 */

type ActivityLabelKey =
  | "activity.create_contact"
  | "activity.create_group"
  | "activity.create_interaction"
  | "activity.create_relationship"
  | "activity.create_tag"
  | "activity.delete_contact"
  | "activity.delete_group"
  | "activity.delete_interaction"
  | "activity.delete_relationship"
  | "activity.delete_tag"
  | "activity.delete_tags"
  | "activity.update_contact"
  | "activity.update_important_dates"
  | "activity.update_interaction"
  | "activity.update_keep_in_touch"
  | "activity.update_relationship";

/** Known tool labels. A tool outside this list uses the generic line. */
const ACTIVITY_LABELS: Record<string, ActivityLabelKey> = {
  create_contact: "activity.create_contact",
  create_group: "activity.create_group",
  create_interaction: "activity.create_interaction",
  create_relationship: "activity.create_relationship",
  create_tag: "activity.create_tag",
  delete_contact: "activity.delete_contact",
  delete_group: "activity.delete_group",
  delete_interaction: "activity.delete_interaction",
  delete_relationship: "activity.delete_relationship",
  delete_tag: "activity.delete_tag",
  delete_tags: "activity.delete_tags",
  update_contact: "activity.update_contact",
  update_important_dates: "activity.update_important_dates",
  update_interaction: "activity.update_interaction",
  update_keep_in_touch: "activity.update_keep_in_touch",
  update_relationship: "activity.update_relationship",
};

function ActivityIcon({ kind }: { kind: ChatToolKind }) {
  return kind === "read" ? <IconSearch size={13} /> : <IconPencil size={13} />;
}

function writeIcon(toolName: string) {
  return toolName.startsWith("delete_") ? <IconTrash size={13} /> : <IconPencil size={13} />;
}

/**
 * Resolves a per-tool label. A tool without a translation falls back to the
 * generic read or write line, so a new tool never shows a raw snake_case name.
 */
function resolveActivityLabel(
  tool: string,
  fallback: string,
  translate: (key: ActivityLabelKey) => string,
): string {
  const key = ACTIVITY_LABELS[tool];

  return key ? translate(key) : fallback;
}

export interface ChatToolStepsProps {
  activities: { displayName?: string; kind: ChatToolKind; tool: string }[];
  /** Collapse reads under one line once the answer has text. */
  collapseReads?: boolean;
  /** A tool is still running, so the last line keeps its spinner. */
  running?: boolean;
}

/** Stable key per activity: the tool name plus how many times it appeared. */
function activityKeys(activities: readonly { tool: string }[]): string[] {
  const seen = new Map<string, number>();

  return activities.map((activity) => {
    const count = seen.get(activity.tool) ?? 0;
    seen.set(activity.tool, count + 1);
    return `${activity.tool}-${count}`;
  });
}

export function ChatToolSteps({
  activities,
  running = false,
  collapseReads = false,
}: ChatToolStepsProps) {
  const t = useChatPageTranslations();

  if (activities.length === 0) {
    return null;
  }

  const reads = activities.filter((activity) => activity.kind === "read");
  const writes = activities.filter((activity) => activity.kind === "write");
  const readKeys = activityKeys(reads);
  const writeKeys = activityKeys(writes);
  const showReadsGrouped = collapseReads && reads.length > 0;

  return (
    <Stack gap={4} mb={8}>
      {showReadsGrouped ? (
        <Group gap={6} wrap="nowrap">
          <IconCheck color="var(--mantine-color-dimmed)" size={13} />
          <Text c="dimmed" size="xs">
            {t("activity.lookedUp")}
          </Text>
        </Group>
      ) : (
        reads.map((activity, index) => (
          <Group gap={6} key={`read-${readKeys[index]}`} wrap="nowrap">
            <Box c="dimmed" style={{ display: "flex" }}>
              <ActivityIcon kind={activity.kind} />
            </Box>
            <Text c="dimmed" size="xs">
              {resolveActivityLabel(activity.tool, t("activity.genericRead"), t)}
            </Text>
          </Group>
        ))
      )}

      {writes.map((activity, index) => {
        const isLast = index === writes.length - 1;
        const isRunning = running && isLast;
        const label = activity.displayName
          ? t("activity.withName", {
              action: resolveActivityLabel(activity.tool, t("activity.genericWrite"), t),
              name: activity.displayName,
            })
          : resolveActivityLabel(activity.tool, t("activity.genericWrite"), t);

        return (
          <Group gap={6} key={`write-${writeKeys[index]}`} wrap="nowrap">
            {isRunning ? (
              <Loader color="dimmed" size={12} type="dots" />
            ) : (
              <Box c="dimmed" style={{ display: "flex" }}>
                {writeIcon(activity.tool)}
              </Box>
            )}
            <Text c="dimmed" size="xs">
              {label}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

export interface ChatDeleteConfirmProps {
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
  toolName: string;
}

/**
 * In-thread confirm for a hard delete. The tool has not run yet.
 *
 * Delete tools take ids only, so the prompt names the kind of record rather
 * than the record itself.
 */
export function ChatDeleteConfirm({
  onCancel,
  onConfirm,
  pending = false,
  toolName,
}: ChatDeleteConfirmProps) {
  const t = useChatPageTranslations();
  const label = resolveActivityLabel(toolName, t("activity.genericDelete"), t);

  return (
    <Box
      mb={8}
      p="sm"
      style={{
        border: "1px solid var(--mantine-color-red-3)",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <Group align="flex-start" gap="xs" mb="xs" wrap="nowrap">
        <ThemeIcon color="red" radius="xl" size={22} variant="light">
          <IconAlertTriangle size={13} />
        </ThemeIcon>
        <Stack gap={2}>
          <Text fw={500} size="sm">
            {label}
          </Text>
          <Text c="dimmed" size="xs">
            {t("activity.deleteConfirmHint")}
          </Text>
        </Stack>
      </Group>
      <Group gap="xs">
        <Button
          color="red"
          leftSection={<IconTrash size={14} />}
          loading={pending}
          onClick={onConfirm}
          size="xs"
        >
          {t("activity.deleteConfirmAction")}
        </Button>
        <Button
          disabled={pending}
          leftSection={<IconX size={14} />}
          onClick={onCancel}
          size="xs"
          variant="default"
        >
          {t("cancel")}
        </Button>
      </Group>
    </Box>
  );
}

/** Shown when a stored turn was stopped or failed before it finished. */
export function ChatIncompleteNotice({ mayHaveSaved }: { mayHaveSaved: boolean }) {
  const t = useChatPageTranslations();

  return (
    <Text c="dimmed" fs="italic" mt={4} size="xs">
      {mayHaveSaved ? t("activity.stoppedMayHaveSaved") : t("activity.stopped")}
    </Text>
  );
}
