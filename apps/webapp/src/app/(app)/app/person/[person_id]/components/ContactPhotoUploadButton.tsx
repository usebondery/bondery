"use client";

import { ContactAvatar } from "./ContactAvatar";
import { openPhotoUploadModal } from "@/lib/photoUpload";
import { PhotoUploadModal } from "@/app/(app)/app/settings/components/PhotoUploadModal";
import { PhotoConfirmModal } from "@/app/(app)/app/settings/components/PhotoConfirmModal";
import { API_ROUTES } from "@bondery/helpers";

interface ContactPhotoUploadButtonProps {
  avatarUrl: string | null;
  contactName: string;
  contactId: string;
}

/**
 * Contact photo upload button with clickable avatar overlay
 * Reuses the same modal flow as user profile photo upload
 */
export function ContactPhotoUploadButton({
  avatarUrl,
  contactName,
  contactId,
}: ContactPhotoUploadButtonProps) {
  const openUploadModal = () => {
    openPhotoUploadModal(
      {
        uploadEndpoint: `${API_ROUTES.CONTACTS}/${contactId}/photo`,
        avatarUrl,
        displayName: contactName,
        // Reload page after successful upload
      },
      {
        TitleModal: "Upload Contact Photo",
        AttachProfilePhoto: "Attach a photo for this contact",
        UpdateError: "Error",
        InvalidFile: "Invalid file",
        DragImageHere: "Drag image here or click to select",
        UpdateProfilePhoto: "Update Contact Photo",
        Cancel: "Cancel",
        ConfirmPhoto: "Confirm Photo",
        UploadingPhoto: "Uploading...",
        PleaseWait: "Please wait",
        UpdateSuccess: "Success",
        PhotoUpdateSuccess: "Contact photo updated successfully",
        PhotoUpdateError: "Failed to update contact photo",
      },
      PhotoUploadModal,
      PhotoConfirmModal,
    );
  };

  return (
    <ContactAvatar
      avatarUrl={avatarUrl}
      contactName={contactName}
      size={120}
      style={{ cursor: "pointer" }}
      onClick={openUploadModal}
    />
  );
}
