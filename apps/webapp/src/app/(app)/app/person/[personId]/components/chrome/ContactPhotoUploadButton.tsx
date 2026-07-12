"use client";

import { openPhotoUploadModal } from "@/components/photo/openPhotoUploadModal";
import { useUploadContactPhotoMutation } from "@/lib/query/hooks/useContacts";
import { ContactAvatar } from "./ContactAvatar";

interface ContactPhotoUploadButtonProps {
  avatarUrl: string | null;
  contactId: string;
  contactName: string;
  firstName?: string | null;
  isMyselfContact?: boolean;
  lastName?: string | null;
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
  const uploadContactPhotoMutation = useUploadContactPhotoMutation(contactId, {
    syncSettings: isMyselfContact,
  });

  const handleOpenUploadModal = () => {
    openPhotoUploadModal({
      uploadFile: (file) => uploadContactPhotoMutation.mutateAsync(file),
      variant: "contact",
    });
  };

  return (
    <ContactAvatar
      avatarUrl={avatarUrl}
      className="cursor-pointer rounded-full!"
      contactName={contactName}
      firstName={firstName}
      lastName={lastName}
      onClick={handleOpenUploadModal}
      size={128}
    />
  );
}
