"use client";

import { ModalFooter, ModalScrollLayout } from "@bondery/mantine-next";
import { Text } from "@mantine/core";
import { IconArrowLeft, IconBrandInstagram } from "@tabler/icons-react";
import {
  ImportPreviewBody,
  type ImportPreviewCount,
  type ImportPreviewPerson,
} from "./ImportPreviewBody";

interface InstagramImportPreviewStepProps {
  backLabel: string;
  cancelLabel: string;
  /** The counts to show, already translated. */
  counts: ImportPreviewCount[];
  /** One line above the counts, such as what the import will do. */
  description: string;
  emptyLabel: string;
  importLabel: string;
  isImporting: boolean;
  onBack: () => void;
  onCancel: () => void;
  onImport: () => void;
  people: ImportPreviewPerson[];
  /** Heading above the chips. */
  peopleLabel: string;
  /** Shown after the chips when more contacts exist than the preview shows. */
  remainderLabel?: string;
}

/** Preview for an Instagram export. Every contact is imported; nothing is selectable. */
export function InstagramImportPreviewStep({
  backLabel,
  cancelLabel,
  counts,
  description,
  emptyLabel,
  remainderLabel,
  importLabel,
  isImporting,
  onBack,
  onCancel,
  onImport,
  people,
  peopleLabel,
}: InstagramImportPreviewStepProps) {
  return (
    <ModalScrollLayout
      fitContent
      footer={
        <ModalFooter
          actionDisabled={isImporting}
          actionLabel={importLabel}
          actionLeftSection={!isImporting ? <IconBrandInstagram size={16} /> : undefined}
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
      header={
        <Text c="dimmed" size="sm">
          {description}
        </Text>
      }
    >
      <ImportPreviewBody
        counts={counts}
        emptyLabel={emptyLabel}
        people={people}
        peopleLabel={peopleLabel}
        remainderLabel={remainderLabel}
      />
    </ModalScrollLayout>
  );
}
