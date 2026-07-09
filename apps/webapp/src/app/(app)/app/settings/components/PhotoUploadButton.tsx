"use client";

import { openPhotoUploadModal } from "@/components/photo/openPhotoUploadModal";
import { UserAvatar } from "@/components/shell/UserAvatar";
import { useUploadMePhotoMutation } from "@/lib/query/hooks/useSettings";

interface PhotoUploadButtonProps {
  avatarUrl: string | null;
  userName: string;
}

export function PhotoUploadButton({ avatarUrl, userName }: PhotoUploadButtonProps) {
  const uploadMePhotoMutation = useUploadMePhotoMutation();

  const handleOpenUploadModal = () => {
    openPhotoUploadModal({
      uploadFile: (file) => uploadMePhotoMutation.mutateAsync(file),
      variant: "profile",
    });
  };

  return (
    <UserAvatar
      avatarUrl={avatarUrl}
      onClick={handleOpenUploadModal}
      radius={"xl"}
      size="lg"
      style={{ cursor: "pointer" }}
      userName={userName}
    />
  );
}
