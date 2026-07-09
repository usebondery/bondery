"use client";

import { DropzoneContent, errorNotificationTemplate } from "@bondery/mantine-next";
import { Dropzone } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconPhoto } from "@tabler/icons-react";
import { AVATAR_UPLOAD } from "@/lib/platform/config";
import {
  type PhotoUploadVariant,
  usePhotoUploadTranslations,
} from "./hooks/usePhotoUploadTranslations";

interface PhotoUploadModalProps {
  onPhotoSelect: (file: File, preview: string) => void;
  variant: PhotoUploadVariant;
}

export function PhotoUploadModal({ variant, onPhotoSelect }: PhotoUploadModalProps) {
  const t = usePhotoUploadTranslations(variant);

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
      accept={AVATAR_UPLOAD.allowedMimeTypes as unknown as string[]}
      maxSize={AVATAR_UPLOAD.maxFileSize}
      onDrop={handleDrop}
      onReject={(files) => {
        notifications.show(
          errorNotificationTemplate({
            description: files[0]?.errors[0]?.message || t("InvalidFile"),
            title: t("UpdateError"),
          }),
        );
      }}
    >
      <DropzoneContent
        acceptIcon={<IconPhoto color="var(--mantine-color-green-6)" size={52} stroke={1.5} />}
        description={t("AttachProfilePhoto")}
        idleIcon={<IconPhoto color="var(--mantine-color-dimmed)" size={52} stroke={1.5} />}
        title={t("DragImageHere")}
      />
    </Dropzone>
  );
}
