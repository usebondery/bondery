"use client";

import { useEffect, useState } from "react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPhoto } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { clientApiFetch, applyTransportResponsePolicy } from "@/lib/api/client";
import { createModalId, useModalBlocking } from "@/lib/modals";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { PhotoConfirmModal } from "./PhotoConfirmModal";

export interface PhotoUploadTranslations {
  TitleModal: string;
  AttachProfilePhoto: string;
  UpdateError: string;
  InvalidFile: string;
  DragImageHere: string;
  UpdateProfilePhoto: string;
  Back?: string;
  Cancel: string;
  ConfirmPhoto: string;
  UploadingPhoto: string;
  PleaseWait: string;
  UpdateSuccess: string;
  PhotoUpdateSuccess: string;
  PhotoUpdateError: string;
}

export interface OpenPhotoUploadModalOptions {
  uploadEndpoint: string;
  onSuccess?: () => void | Promise<void>;
  translations: PhotoUploadTranslations;
}

interface PhotoUploadFlowBodyProps extends OpenPhotoUploadModalOptions {
  modalId: string;
}

type PhotoUploadStep = "pick" | "confirm";

function PhotoUploadFlowBody({
  modalId,
  uploadEndpoint,
  onSuccess,
  translations,
}: PhotoUploadFlowBodyProps) {
  const [step, setStep] = useState<PhotoUploadStep>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useModalBlocking(modalId, isUploading);

  useEffect(() => {
    modals.updateModal({
      modalId,
      title:
        step === "pick" ? (
          <ModalTitle
            text={translations.TitleModal}
            icon={<IconPhoto size={20} stroke={1.5} />}
          />
        ) : (
          <ModalTitle
            text={translations.UpdateProfilePhoto}
            icon={<IconPhoto size={20} stroke={1.5} />}
          />
        ),
      size: "lg",
    });
  }, [modalId, step, translations.TitleModal, translations.UpdateProfilePhoto]);

  const handlePhotoSelect = (selectedFile: File, selectedPreview: string) => {
    setFile(selectedFile);
    setPreview(selectedPreview);
    setStep("confirm");
  };

  const handleBack = () => {
    if (isUploading) return;
    setFile(null);
    setPreview("");
    setStep("pick");
  };

  const handleCancel = () => {
    if (isUploading) return;
    modals.close(modalId);
  };

  const handleConfirm = async () => {
    if (!file || isUploading) return;

    setIsUploading(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: translations.UploadingPhoto,
        description: translations.PleaseWait,
      }),
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await clientApiFetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      notifications.hide(loadingNotification);

      if (!response.ok) {
        applyTransportResponsePolicy(response);
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }

      notifications.show(
        successNotificationTemplate({
          title: translations.UpdateSuccess,
          description: translations.PhotoUpdateSuccess,
        }),
      );

      modals.close(modalId);

      if (onSuccess) {
        await onSuccess();
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: translations.UpdateError,
          description: error instanceof Error ? error.message : translations.PhotoUpdateError,
        }),
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (step === "pick") {
    return (
      <PhotoUploadModal
        onPhotoSelect={handlePhotoSelect}
        translations={{
          TitleModal: translations.TitleModal,
          AttachProfilePhoto: translations.AttachProfilePhoto,
          UpdateError: translations.UpdateError,
          InvalidFile: translations.InvalidFile,
          DragImageHere: translations.DragImageHere,
        }}
      />
    );
  }

  return (
    <PhotoConfirmModal
      preview={preview}
      onBack={handleBack}
      onCancel={handleCancel}
      onConfirm={() => {
        void handleConfirm();
      }}
      actionLoading={isUploading}
      actionDisabled={isUploading}
      backDisabled={isUploading}
      cancelDisabled={isUploading}
      translations={{
        UpdateProfilePhoto: translations.UpdateProfilePhoto,
        Back: translations.Back,
        Cancel: translations.Cancel,
        ConfirmPhoto: translations.ConfirmPhoto,
      }}
    />
  );
}

export function openPhotoUploadModal({
  uploadEndpoint,
  onSuccess,
  translations,
}: OpenPhotoUploadModalOptions) {
  const modalId = createModalId("photo-upload");

  modals.open({
    modalId,
    title: (
      <ModalTitle text={translations.TitleModal} icon={<IconPhoto size={20} stroke={1.5} />} />
    ),
    size: "lg",
    children: (
      <PhotoUploadFlowBody
        modalId={modalId}
        uploadEndpoint={uploadEndpoint}
        onSuccess={onSuccess}
        translations={translations}
      />
    ),
  });
}
