import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Network from "expo-network";
import { deleteContactPhoto, uploadContactPhoto } from "../../../lib/api/client";import { AVATAR_UPLOAD } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";

interface UseContactPhotoUploadOptions {
  contactId: string;
  onAvatarUpdated: (avatarUrl: string | null) => void;
}

export function useContactPhotoUpload({
  contactId,
  onAvatarUpdated,
}: UseContactPhotoUploadOptions) {
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const [isRemoveConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const ensureOnline = useCallback(async (): Promise<boolean> => {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected) {
      return true;
    }
    showToast({
      type: "error",
      headline: t("MobileApp.Common.ErrorTitle"),
      description: t("MobileApp.ContactIdentity.PhotoRequiresConnection"),
    });
    return false;
  }, [showToast, t]);

  const uploadPhoto = useCallback(
    async (uri: string, mimeType: string) => {
      if (!(await ensureOnline())) {
        return;
      }

      setIsPhotoBusy(true);
      try {
        const { avatarUrl } = await uploadContactPhoto(contactId, uri, mimeType);
        onAvatarUpdated(avatarUrl);
      } catch (err) {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description:
            err instanceof Error
              ? err.message
              : t("MobileApp.ContactIdentity.PhotoUploadFailed"),
        });
      } finally {
        setIsPhotoBusy(false);
      }
    },
    [contactId, ensureOnline, onAvatarUpdated, showToast, t],
  );

  const choosePhotoFromLibrary = useCallback(async () => {
    if (!(await ensureOnline())) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.ContactIdentity.PhotoPermissionDenied"),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";

    if (
      !AVATAR_UPLOAD.allowedMimeTypes.includes(
        mimeType as (typeof AVATAR_UPLOAD.allowedMimeTypes)[number],
      )
    ) {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.ContactIdentity.InvalidPhotoType"),
      });
      return;
    }

    await uploadPhoto(asset.uri, mimeType);
  }, [ensureOnline, showToast, t, uploadPhoto]);

  const removePhoto = useCallback(async () => {
    if (!(await ensureOnline())) {
      return;
    }

    setIsPhotoBusy(true);
    try {
      await deleteContactPhoto(contactId);
      onAvatarUpdated(null);
      setRemoveConfirmOpen(false);
    } catch {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.ContactIdentity.PhotoRemoveFailed"),
      });
    } finally {
      setIsPhotoBusy(false);
    }
  }, [contactId, ensureOnline, onAvatarUpdated, showToast, t]);
  return {
    isPhotoBusy,
    isRemoveConfirmOpen,
    setRemoveConfirmOpen,
    choosePhotoFromLibrary,
    removePhoto,
  };
}
