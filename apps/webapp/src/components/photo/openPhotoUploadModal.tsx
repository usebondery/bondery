"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPhoto } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useCommonTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import {
  type PhotoUploadVariant,
  usePhotoUploadTranslations,
} from "./hooks/usePhotoUploadTranslations";
import { PhotoConfirmModal } from "./PhotoConfirmModal";
import { PhotoUploadModal } from "./PhotoUploadModal";

export type { PhotoUploadVariant } from "./hooks/usePhotoUploadTranslations";

export interface OpenPhotoUploadModalOptions {
  uploadFile: (file: File) => Promise<void>;
  variant: PhotoUploadVariant;
}

interface PhotoUploadFlowBodyProps extends OpenPhotoUploadModalOptions {
  modalId: string;
}

type PhotoUploadStep = "pick" | "confirm";

function PhotoUploadModalTitle({ variant }: { variant: PhotoUploadVariant }) {
  const t = usePhotoUploadTranslations(variant);
  return <ModalTitle icon={<IconPhoto size={20} stroke={1.5} />} text={t("TitleModal")} />;
}

function PhotoUploadFlowBody({ modalId, uploadFile, variant }: PhotoUploadFlowBodyProps) {
  const tCommon = useCommonTranslations();
  const t = usePhotoUploadTranslations(variant);
  const [step, setStep] = useState<PhotoUploadStep>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { closeModal } = useModalDismiss(modalId, isUploading);

  useEffect(() => {
    modals.updateModal({
      modalId,
      size: "lg",
      title:
        step === "pick" ? (
          <ModalTitle icon={<IconPhoto size={20} stroke={1.5} />} text={t("TitleModal")} />
        ) : (
          <ModalTitle icon={<IconPhoto size={20} stroke={1.5} />} text={t("UpdateProfilePhoto")} />
        ),
    });
  }, [modalId, step, t]);

  const handlePhotoSelect = (selectedFile: File, selectedPreview: string) => {
    setFile(selectedFile);
    setPreview(selectedPreview);
    setStep("confirm");
  };

  const handleBack = () => {
    if (isUploading) {
      return;
    }
    setFile(null);
    setPreview("");
    setStep("pick");
  };

  const handleCancel = () => {
    if (isUploading) {
      return;
    }
    closeModal();
  };

  const handleConfirm = async () => {
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UploadingPhoto"),
      }),
    });

    try {
      await uploadFile(file);

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          description: t("PhotoUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );

      closeModal();
    } catch (error) {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("UpdateError"),
        }),
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (step === "pick") {
    return <PhotoUploadModal onPhotoSelect={handlePhotoSelect} variant={variant} />;
  }

  return (
    <PhotoConfirmModal
      actionDisabled={isUploading}
      actionLoading={isUploading}
      backDisabled={isUploading}
      cancelDisabled={isUploading}
      onBack={handleBack}
      onCancel={handleCancel}
      onConfirm={() => {
        void handleConfirm();
      }}
      preview={preview}
      variant={variant}
    />
  );
}

export function openPhotoUploadModal({ uploadFile, variant }: OpenPhotoUploadModalOptions) {
  const modalId = createModalId("photo-upload");

  modals.open({
    children: <PhotoUploadFlowBody modalId={modalId} uploadFile={uploadFile} variant={variant} />,
    modalId,
    size: "lg",
    title: <PhotoUploadModalTitle variant={variant} />,
  });
}
