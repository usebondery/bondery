import * as ImagePicker from "expo-image-picker";
import * as Network from "expo-network";
import { useCallback, useState } from "react";
import { deleteContactPhoto, uploadContactPhoto } from "../../../lib/api/client";
import { AVATAR_UPLOAD } from "../../../lib/config";
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
      description: t("PhotoRequiresConnection", { ns: "MobileContactIdentity" }),
      headline: t("feedback.errorTitle", { ns: "common" }),
      type: "error",
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
          description:
            err instanceof Error
              ? err.message
              : t("PhotoUploadFailed", { ns: "MobileContactIdentity" }),
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
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
        description: t("PhotoPermissionDenied", { ns: "MobileContactIdentity" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
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
        description: t("InvalidPhotoType", { ns: "MobileContactIdentity" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
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
        description: t("PhotoRemoveFailed", { ns: "MobileContactIdentity" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
    } finally {
      setIsPhotoBusy(false);
    }
  }, [contactId, ensureOnline, onAvatarUpdated, showToast, t]);
  return {
    choosePhotoFromLibrary,
    isPhotoBusy,
    isRemoveConfirmOpen,
    removePhoto,
    setRemoveConfirmOpen,
  };
}
