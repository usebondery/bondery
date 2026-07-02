"use client";

import { ContactAvatar } from "./ContactAvatar";
import { openPhotoUploadModal } from "@/app/(app)/app/components/photo/openPhotoUploadModal";
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

  const handleOpenUploadModal = () => {
    openPhotoUploadModal({
      uploadEndpoint: `${API_ROUTES.CONTACTS}/${contactId}/photo`,
      onSuccess: async () => {
        const queryClient = getQueryClient();
        await Promise.all([
          invalidateContactDetail(queryClient, contactId),
          isMyselfContact ? invalidateSettings(queryClient) : Promise.resolve(),
        ]);
      },
      translations: {
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
    });
  };

  return (
    <ContactAvatar
      avatarUrl={avatarUrl}
      contactName={contactName}
      firstName={firstName}
      lastName={lastName}
      size={128}
      className="cursor-pointer rounded-full!"
      onClick={handleOpenUploadModal}
    />
  );
}
