"use client";

import { DropzoneContent, ModalFooter } from "@bondery/mantine-next";
import { Stack } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconArrowLeft, IconFileZip } from "@tabler/icons-react";
import type { ComponentProps, ReactNode, RefObject } from "react";

type DropzoneAccept = NonNullable<ComponentProps<typeof Dropzone>["accept"]>;
type DropzoneRejectHandler = NonNullable<ComponentProps<typeof Dropzone>["onReject"]>;

interface ImportZipUploadStepProps {
  accept: DropzoneAccept;
  backLabel: string;
  cancelLabel: string;
  dropzoneDescription: string;
  dropzoneTitle: string;
  header?: ReactNode;
  loading?: boolean;
  maxSize: number;
  onBack: () => void;
  onCancel: () => void;
  onDrop: (files: File[]) => void;
  onReject: DropzoneRejectHandler;
  onSelectFile: () => void;
  openRef: RefObject<(() => void) | null>;
  selectZipFileLabel: string;
}

export const IMPORT_ZIP_ACCEPT: DropzoneAccept = {
  [MIME_TYPES.zip]: [".zip"],
  "application/octet-stream": [".zip"],
  "application/x-zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "multipart/x-zip": [".zip"],
};

export function ImportZipUploadStep({
  accept,
  backLabel,
  cancelLabel,
  dropzoneDescription,
  dropzoneTitle,
  header,
  loading = false,
  maxSize,
  onBack,
  onCancel,
  onDrop,
  onReject,
  onSelectFile,
  openRef,
  selectZipFileLabel,
}: ImportZipUploadStepProps) {
  return (
    <Stack gap="md">
      {header}
      <Dropzone
        accept={accept}
        loading={loading}
        maxFiles={1}
        maxSize={maxSize}
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
