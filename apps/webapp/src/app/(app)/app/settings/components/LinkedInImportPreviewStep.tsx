"use client";

import { ModalFooter, ModalScrollLayout } from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { Badge, Group, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBrandLinkedin,
  IconCircleCheck,
} from "@tabler/icons-react";
import ContactsTable from "@/app/(app)/app/components/contacts/ContactsTableV2";

interface LinkedInImportPreviewStepProps {
  allSelected: boolean;
  alreadyExistsCount: number;
  backLabel: string;
  cancelLabel: string;
  chooseContactsHint: string;
  existingHandleTooltip: string;
  importSelectedLabel: string;
  invalidContactsCount: number;
  isImporting: boolean;
  labels: {
    alreadyExists: string;
    invalid: string;
    total: string;
    valid: string;
  };
  noContactsFound: string;
  noContactsMatchSearch: string;
  nonSelectableIds: Set<string>;
  onBack: () => void;
  onCancel: () => void;
  onImport: () => void;
  onSelectAll: () => void;
  onSelectOne: (id: string, options?: { shiftKey?: boolean; index?: number }) => void;
  previewContacts: Contact[];
  selectedIds: Set<string>;
  someSelected: boolean;
}

export function LinkedInImportPreviewStep({
  labels,
  invalidContactsCount,
  alreadyExistsCount,
  chooseContactsHint,
  previewContacts,
  nonSelectableIds,
  allSelected,
  someSelected,
  selectedIds,
  onSelectAll,
  onSelectOne,
  noContactsFound,
  noContactsMatchSearch,
  existingHandleTooltip,
  isImporting,
  importSelectedLabel,
  backLabel,
  cancelLabel,
  onImport,
  onBack,
  onCancel,
}: LinkedInImportPreviewStepProps) {
  return (
    <ModalScrollLayout
      footer={
        <ModalFooter
          actionDisabled={isImporting}
          actionLabel={importSelectedLabel}
          actionLeftSection={!isImporting ? <IconBrandLinkedin size={16} /> : undefined}
          actionLoading={isImporting}
          backDisabled={isImporting}
          backLabel={backLabel}
          backLeftSection={<IconArrowLeft size={16} />}
          cancelDisabled={isImporting}
          cancelLabel={cancelLabel}
          mt={0}
          onAction={onImport}
          onBack={onBack}
          onCancel={onCancel}
        />
      }
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Badge color="blue" variant="light">
              {labels.total}
            </Badge>
            <Badge color="green" leftSection={<IconCircleCheck size={12} />} variant="light">
              {labels.valid}
            </Badge>
            {invalidContactsCount > 0 ? (
              <Badge color="orange" leftSection={<IconAlertTriangle size={12} />} variant="light">
                {labels.invalid}
              </Badge>
            ) : null}
            {alreadyExistsCount > 0 ? (
              <Badge color="gray" variant="light">
                {labels.alreadyExists}
              </Badge>
            ) : null}
          </Group>
        </Group>

        <Text c="dimmed" size="sm">
          {chooseContactsHint}
        </Text>

        <ContactsTable
          allSelected={allSelected}
          contacts={previewContacts}
          disableNameLink
          noContactsFound={noContactsFound}
          noContactsMatchSearch={noContactsMatchSearch}
          nonSelectableIds={nonSelectableIds}
          nonSelectableTooltip={existingHandleTooltip}
          onSelectAll={onSelectAll}
          onSelectOne={onSelectOne}
          selectedIds={selectedIds}
          showSelection
          someSelected={someSelected}
          visibleColumns={["name", "headline", "social"]}
        />
      </Stack>
    </ModalScrollLayout>
  );
}
