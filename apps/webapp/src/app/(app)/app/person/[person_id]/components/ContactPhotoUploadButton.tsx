"use client";

import { ContactAvatar } from "./ContactAvatar";
import { openPhotoUploadModal } from "@/lib/photoUpload";
import { PhotoUploadModal } from "@/app/(app)/app/settings/components/PhotoUploadModal";
import { PhotoConfirmModal } from "@/app/(app)/app/settings/components/PhotoConfirmModal";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { getQueryClient } from "@/lib/query/client";
import {
  invalidateContactDetail,
  invalidateSettings,
} from "@/lib/query/invalidation";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

interface ContactPhotoUploadButtonProps {
  avatarUrl: string | null;
  contactName: string;
  contactId: string;
  firstName?: string | null;
  lastName?: string | null;
  isMyselfContact?: boolean;
}

/**
 * Contact photo upload button with clickable avatar overlay
 * Reuses the same modal flow as user profile photo upload
 */
export function ContactPhotoUploadButton({
  avatarUrl,
  contactName,
  contactId,
  firstName,
  lastName,
  isMyselfContact,
}: ContactPhotoUploadButtonProps) {
  const t = useTranslations("ContactPhotoUpload");

  const openUploadModal = () => {
    openPhotoUploadModal(
      {
        uploadEndpoint: `${API_ROUTES.CONTACTS}/${contactId}/photo`,
        avatarUrl,
        displayName: contactName,
        onSuccess: async () => {
          const queryClient = getQueryClient();
          await Promise.all([
            invalidateContactDetail(queryClient, contactId),
            isMyselfContact ? invalidateSettings(queryClient) : Promise.resolve(),
          ]);
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
    <ContactAvatar
      avatarUrl={avatarUrl}
      contactName={contactName}
      firstName={firstName}
      lastName={lastName}
      size={128}
      className="cursor-pointer rounded-full!"
      onClick={openUploadModal}
    />
  );
}
