"use client";

import { DropzoneContent, ModalFooter } from "@bondery/mantine-next";
import { Stack } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconArrowLeft, IconFileZip } from "@tabler/icons-react";
import type { RefObject } from "react";
import { INSTAGRAM_MAX_FILE_SIZE_BYTES } from "../utils/instagram-import-helpers";

interface InstagramImportUploadStepProps {
  backLabel: string;
  cancelLabel: string;
  dropzoneDescription: string;
  dropzoneTitle: string;
  isParsing: boolean;
  onBack: () => void;
  onCancel: () => void;
  onDrop: (files: File[]) => void;
  onReject: (
    rejections: Parameters<NonNullable<React.ComponentProps<typeof Dropzone>["onReject"]>>[0],
  ) => void;
  onSelectFile: () => void;
  openRef: RefObject<(() => void) | null>;
  selectZipFileLabel: string;
}

export function InstagramImportUploadStep({
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
}: InstagramImportUploadStepProps) {
  return (
    <Stack gap="md">
      <Dropzone
        accept={{
          [MIME_TYPES.zip]: [".zip"],
          "application/octet-stream": [".zip"],
          "application/x-zip": [".zip"],
          "application/x-zip-compressed": [".zip"],
          "multipart/x-zip": [".zip"],
        }}
        loading={isParsing}
        maxFiles={1}
        maxSize={INSTAGRAM_MAX_FILE_SIZE_BYTES}
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
