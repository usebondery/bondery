"use client";

import { DropzoneContent, ModalFooter } from "@bondery/mantine-next";
import { Stack } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconArrowLeft, IconFileZip } from "@tabler/icons-react";
import type { RefObject } from "react";

interface LinkedInImportUploadStepProps {
  backLabel: string;
  cancelLabel: string;
  dropzoneDescription: string;
  dropzoneTitle: string;
  isParsing: boolean;
  onBack: () => void;
  onCancel: () => void;
  onDrop: (files: File[]) => void;
  onReject: () => void;
  onSelectFile: () => void;
  openRef: RefObject<(() => void) | null>;
  selectZipFileLabel: string;
}

export function LinkedInImportUploadStep({
  dropzoneTitle,
  dropzoneDescription,
  isParsing,
  onDrop,
  onReject,
  openRef,
  selectZipFileLabel,
  backLabel,
  cancelLabel,
  onSelectFile,
  onBack,
  onCancel,
}: LinkedInImportUploadStepProps) {
  return (
    <Stack gap="md">
      <Dropzone
        accept={{
          [MIME_TYPES.zip]: [".zip"],
          "application/octet-stream": [".zip", ".csv"],
          "application/x-zip": [".zip"],
          "application/x-zip-compressed": [".zip"],
          "multipart/x-zip": [".zip"],
          [MIME_TYPES.csv]: [".csv"],
          "application/csv": [".csv"],
          "application/vnd.ms-excel": [".csv"],
          "text/plain": [".csv"],
        }}
        loading={isParsing}
        maxFiles={1}
        maxSize={30 * 1024 * 1024}
        onDrop={onDrop}
        onReject={onReject}
        openRef={openRef}
      >
        <DropzoneContent description={dropzoneDescription} title={dropzoneTitle} />
      </Dropzone>

      <ModalFooter
        actionLabel={selectZipFileLabel}
        actionLeftSection={<IconFileZip size={16} />}
        backLabel={backLabel}
        backLeftSection={<IconArrowLeft size={16} />}
        cancelLabel={cancelLabel}
        onAction={onSelectFile}
        onBack={onBack}
        onCancel={onCancel}
      />
    </Stack>
  );
}
