"use client";

import { useTranslations } from "next-intl";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { PhotoConfirmModal } from "./PhotoConfirmModal";
import { UserAvatar } from "@/components/UserAvatar";
import { openPhotoUploadModal } from "@/lib/photoUpload";

interface PhotoUploadButtonProps {
  avatarUrl: string | null;
  userName: string;
}

export function PhotoUploadButton({ avatarUrl, userName }: PhotoUploadButtonProps) {
  const t = useTranslations("SettingsPage.Profile");

  const openUploadModal = () => {
    openPhotoUploadModal(
      {
        uploadEndpoint: "/api/account/photo",
        avatarUrl,
        displayName: userName,
      },
      {
        TitleModal: t("TitleModal"),
        AttachProfilePhoto: t("AttachProfilePhoto"),
        UpdateError: t("UpdateError"),
        InvalidFile: t("InvalidFile"),
        DragImageHere: t("DragImageHere"),
        UpdateProfilePhoto: t("UpdateProfilePhoto"),
        Cancel: t("Cancel"),
        ConfirmPhoto: t("ConfirmPhoto"),
        UploadingPhoto: t("UploadingPhoto"),
        PleaseWait: t("PleaseWait"),
        UpdateSuccess: t("UpdateSuccess"),
        PhotoUpdateSuccess: t("PhotoUpdateSuccess"),
        PhotoUpdateError: t("PhotoUpdateError"),
      },
      PhotoUploadModal,
      PhotoConfirmModal,
    );
  };

  return (
    <UserAvatar
      avatarUrl={avatarUrl}
      userName={userName}
      size="lg"
      style={{ cursor: "pointer" }}
      onClick={openUploadModal}
    />
  );
}
