"use client";

import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { PhotoConfirmModal } from "./PhotoConfirmModal";
import { UserAvatar } from "@/app/(app)/app/components/UserAvatar";
import { openPhotoUploadModal } from "@/lib/photoUpload";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { getQueryClient } from "@/lib/query/client";
import { invalidateSettings } from "@/lib/query/invalidation";

interface PhotoUploadButtonProps {
  avatarUrl: string | null;
  userName: string;
}

export function PhotoUploadButton({ avatarUrl, userName }: PhotoUploadButtonProps) {
  const t = useTranslations("SettingsPage.Profile");

  const openUploadModal = () => {
    openPhotoUploadModal(
      {
        uploadEndpoint: API_ROUTES.ME_PHOTO,
        avatarUrl,
        displayName: userName,
        onSuccess: async () => {
          await invalidateSettings(getQueryClient());
        },
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
      radius={"xl"}
      style={{ cursor: "pointer" }}
      onClick={openUploadModal}
    />
  );
}
