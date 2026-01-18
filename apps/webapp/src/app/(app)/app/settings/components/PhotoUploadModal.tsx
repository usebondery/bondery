"use client";

import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconUpload, IconPhoto, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Stack, Text, Group } from "@mantine/core";
import { AVATAR_UPLOAD } from "@/lib/config";

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
    <Stack gap="md">
      <Dropzone
        onDrop={handleDrop}
        onReject={(files) => {
          notifications.show({
            title: translations.UpdateError,
            message: files[0]?.errors[0]?.message || translations.InvalidFile,
            color: "red",
          });
        }}
        maxSize={AVATAR_UPLOAD.maxFileSize}
        accept={AVATAR_UPLOAD.allowedMimeTypes as unknown as string[]}
      >
        <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: "none" }}>
          <Dropzone.Accept>
            <IconUpload size={52} stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={52} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={52} stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              {translations.DragImageHere}
            </Text>
            <Text size="sm" c="dimmed" inline mt={"xs"}>
              {translations.AttachProfilePhoto}
            </Text>
          </div>
        </Group>
      </Dropzone>
    </Stack>
  );
}
