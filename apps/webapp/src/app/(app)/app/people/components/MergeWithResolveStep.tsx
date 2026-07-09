"use client";

import { ModalFooter, ModalScrollLayout, PersonChip } from "@bondery/mantine-next";
import type { Contact, MergeConflictChoice, MergeConflictField } from "@bondery/schemas";
import { Center, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowMerge } from "@tabler/icons-react";
import { SelectableCard } from "@/app/(app)/app/components/SelectableCard";
import {
  formatConflictDisplayValue,
  normalizeDisplayText,
  toPersonPreview,
} from "../utils/merge-conflict-helpers";
import { MergeAvatarConflictPicker } from "./MergeAvatarConflictPicker";

interface ConflictEntry {
  field: MergeConflictField;
  leftValue: unknown;
  rightValue: unknown;
}

interface MergeWithResolveStepProps {
  backLabel: string;
  cancelLabel: string;
  conflictChoices: Partial<Record<MergeConflictField, MergeConflictChoice>>;
  conflictHint: string;
  conflicts: ConflictEntry[];
  fieldLabel: (field: MergeConflictField | "latLng") => string;
  isSubmitting: boolean;
  leftContact: Contact | null;
  mergeLabel: string;
  noConflictsLabel: string;
  onBack?: () => void;
  onCancel: () => void;
  onChangeChoice: (
    updater: (
      prev: Partial<Record<MergeConflictField, MergeConflictChoice>>,
    ) => Partial<Record<MergeConflictField, MergeConflictChoice>>,
  ) => void;
  onMerge: () => void;
  rightContact: Contact | null;
  showAvatarPicker: boolean;
  showBackButton: boolean;
}

export function MergeWithResolveStep({
  backLabel,
  cancelLabel,
  conflictChoices,
  conflictHint,
  conflicts,
  fieldLabel,
  isSubmitting,
  leftContact,
  mergeLabel,
  noConflictsLabel,
  onBack,
  onCancel,
  onChangeChoice,
  onMerge,
  rightContact,
  showAvatarPicker,
  showBackButton,
}: MergeWithResolveStepProps) {
  const renderConflictContent = () => {
    if (conflicts.length === 0) {
      return (
        <>
          {showAvatarPicker && leftContact && rightContact ? (
            <MergeAvatarConflictPicker
              choice={conflictChoices.avatar ?? "left"}
              label={fieldLabel("avatar")}
              leftContact={leftContact}
              onChange={(side) =>
                onChangeChoice((prev) => ({
                  ...prev,
                  avatar: side,
                }))
              }
              rightContact={rightContact}
            />
          ) : (
            <Paper p="md" radius="md" withBorder>
              <Text c="dimmed" size="sm">
                {noConflictsLabel}
              </Text>
            </Paper>
          )}
        </>
      );
    }

    const hasLatLngPair =
      conflicts.some((c) => c.field === "latitude") &&
      conflicts.some((c) => c.field === "longitude");
    const lngConflict = conflicts.find((c) => c.field === "longitude");

    return (
      <Stack gap="sm">
        <Text c="dimmed" size="sm">
          {conflictHint}
        </Text>
        <SimpleGrid cols={2} mb="xs" mt="md" spacing="sm">
          <Center>
            <PersonChip isClickable person={toPersonPreview(leftContact)} />
          </Center>
          <Center>
            <PersonChip isClickable person={toPersonPreview(rightContact)} />
          </Center>
        </SimpleGrid>
        {leftContact && rightContact ? (
          <MergeAvatarConflictPicker
            choice={conflictChoices.avatar ?? "left"}
            label={fieldLabel("avatar")}
            leftContact={leftContact}
            onChange={(side) =>
              onChangeChoice((prev) => ({
                ...prev,
                avatar: side,
              }))
            }
            rightContact={rightContact}
          />
        ) : null}
        {conflicts
          .filter((c) => !(c.field === "longitude" && hasLatLngPair))
          .map((conflict) => {
            const isLatLng = conflict.field === "latitude" && hasLatLngPair;
            const selectedChoice = conflictChoices[conflict.field] || "left";

            const label = isLatLng ? fieldLabel("latLng") : fieldLabel(conflict.field);

            const leftDesc = isLatLng
              ? `${normalizeDisplayText(conflict.leftValue)}, ${normalizeDisplayText(lngConflict?.leftValue)}`
              : formatConflictDisplayValue(conflict.field, conflict.leftValue) || undefined;

            const rightDesc = isLatLng
              ? `${normalizeDisplayText(conflict.rightValue)}, ${normalizeDisplayText(lngConflict?.rightValue)}`
              : formatConflictDisplayValue(conflict.field, conflict.rightValue) || undefined;

            const handleSelect = (side: MergeConflictChoice) => {
              onChangeChoice((prev) => {
                const next = { ...prev, [conflict.field]: side };
                if (isLatLng) {
                  next.longitude = side;
                }
                return next;
              });
            };

            return (
              <Stack gap="sm" key={conflict.field}>
                <SimpleGrid cols={2} spacing="sm">
                  <SelectableCard
                    description={leftDesc || undefined}
                    label={label}
                    onClick={() => handleSelect("left")}
                    selected={selectedChoice === "left"}
                  />
                  <SelectableCard
                    description={rightDesc || undefined}
                    label={label}
                    onClick={() => handleSelect("right")}
                    selected={selectedChoice === "right"}
                  />
                </SimpleGrid>
              </Stack>
            );
          })}
      </Stack>
    );
  };

  return (
    <ModalScrollLayout
      footer={
        <ModalFooter
          mt={0}
          {...(showBackButton
            ? {
                backDisabled: isSubmitting,
                backLabel,
                backLeftSection: <IconArrowLeft size={16} />,
                onBack,
              }
            : {})}
          actionDisabled={isSubmitting}
          actionLabel={mergeLabel}
          actionLeftSection={<IconArrowMerge size={16} />}
          actionLoading={isSubmitting}
          cancelDisabled={isSubmitting}
          cancelLabel={cancelLabel}
          onAction={onMerge}
          onCancel={onCancel}
        />
      }
    >
      <Stack gap="sm">{renderConflictContent()}</Stack>
    </ModalScrollLayout>
  );
}
