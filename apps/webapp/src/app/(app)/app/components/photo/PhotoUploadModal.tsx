"use client";

import { Dropzone } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconPhoto } from "@tabler/icons-react";
import { AVATAR_UPLOAD } from "@/lib/config";
import { DropzoneContent, errorNotificationTemplate } from "@bondery/mantine-next";

interface PhotoUploadModalProps {
  onPhotoSelect: (file: File, preview: string) => void;
  translations: {
    TitleModal: string;
    AttachProfilePhoto: string;
    UpdateError: string;
    InvalidFile: string;
    DragImageHere: string;
  };
}

export function PhotoUploadModal({ onPhotoSelect, translations }: PhotoUploadModalProps) {
  const handleDrop = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        onPhotoSelect(file, preview);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dropzone
      onDrop={handleDrop}
      onReject={(files) => {
        notifications.show(
          errorNotificationTemplate({
            title: translations.UpdateError,
            description: files[0]?.errors[0]?.message || translations.InvalidFile,
          }),
        );
      }}
      maxSize={AVATAR_UPLOAD.maxFileSize}
      accept={AVATAR_UPLOAD.allowedMimeTypes as unknown as string[]}
    >
      <DropzoneContent
        title={translations.DragImageHere}
        description={translations.AttachProfilePhoto}
        idleIcon={<IconPhoto size={52} stroke={1.5} color="var(--mantine-color-dimmed)" />}
        acceptIcon={<IconPhoto size={52} stroke={1.5} color="var(--mantine-color-green-6)" />}
        rejectIcon={<IconPhoto size={52} stroke={1.5} color="var(--mantine-color-red-6)" />}
      />
    </Dropzone>
  );
}
