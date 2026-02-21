/**
 * Shared photo upload functionality
 * Can be used for both user profile photos and contact photos
 */

"use client";

import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPhoto } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";

export interface PhotoUploadTranslations {
  TitleModal: string;
  AttachProfilePhoto: string;
  UpdateError: string;
  InvalidFile: string;
  DragImageHere: string;
  UpdateProfilePhoto: string;
  Cancel: string;
  ConfirmPhoto: string;
  UploadingPhoto: string;
  PleaseWait: string;
  UpdateSuccess: string;
  PhotoUpdateSuccess: string;
  PhotoUpdateError: string;
}

export interface PhotoUploadConfig {
  /** API endpoint to upload the photo to */
  uploadEndpoint: string;
  /** Callback after successful upload */
  onSuccess?: () => void;
  /** Current avatar URL for preview */
  avatarUrl?: string | null;
  /** Name for avatar display */
  displayName?: string;
}

/**
 * Opens a photo upload modal flow with preview and confirmation
 * @param config - Upload configuration including endpoint and callbacks
 * @param translations - Translation strings for the modal
 * @param PhotoUploadModal - The upload modal component
 * @param PhotoConfirmModal - The confirmation modal component
 */
export async function openPhotoUploadModal(
  config: PhotoUploadConfig,
  translations: PhotoUploadTranslations,
  PhotoUploadModal: React.ComponentType<any>,
  PhotoConfirmModal: React.ComponentType<any>,
) {
  const modalId = "photo-upload-modal";

  const handlePhotoSelect = (file: File, preview: string) => {
    // Update the existing modal to show confirmation step
    modals.open({
      modalId,
      title: (
        <ModalTitle
          text={translations.UpdateProfilePhoto}
          icon={<IconPhoto size={20} stroke={1.5} />}
        />
      ),
      children: (
        <PhotoConfirmModal
          preview={preview}
          onCancel={() => modals.close(modalId)}
          onConfirm={() => handlePhotoConfirm(file)}
          translations={{
            UpdateProfilePhoto: translations.UpdateProfilePhoto,
            Cancel: translations.Cancel,
            ConfirmPhoto: translations.ConfirmPhoto,
          }}
        />
      ),
      centered: true,
      size: "md",
      withCloseButton: true,
    });
  };

  const handlePhotoConfirm = async (file: File) => {
    modals.close(modalId);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: translations.UploadingPhoto,
        description: translations.PleaseWait,
      }),
      
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(config.uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      notifications.hide(loadingNotification);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }

      notifications.show(
        successNotificationTemplate({
          title: translations.UpdateSuccess,
          description: translations.PhotoUpdateSuccess,
        }),
      );

      // Call success callback or reload page
      if (config.onSuccess) {
        config.onSuccess();
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: translations.UpdateError,
          description: error instanceof Error ? error.message : translations.PhotoUpdateError,
        }),
      );
    }
  };

  modals.open({
    modalId,
    title: (
      <ModalTitle text={translations.TitleModal} icon={<IconPhoto size={20} stroke={1.5} />} />
    ),
    children: (
      <PhotoUploadModal
        onPhotoSelect={(file: File, preview: string) => handlePhotoSelect(file, preview)}
        translations={{
          TitleModal: translations.TitleModal,
          AttachProfilePhoto: translations.AttachProfilePhoto,
          UpdateError: translations.UpdateError,
          InvalidFile: translations.InvalidFile,
          DragImageHere: translations.DragImageHere,
        }}
      />
    ),
    centered: true,
    size: "lg",
    withCloseButton: true,
  });
}
