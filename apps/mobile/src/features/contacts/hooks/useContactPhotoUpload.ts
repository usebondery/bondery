import * as ImagePicker from "expo-image-picker";
import * as Network from "expo-network";
import { useCallback, useState } from "react";
import {
  useCommonTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import { deleteContactPhoto, uploadContactPhoto } from "../../../lib/api/client";
import { AVATAR_UPLOAD } from "../../../lib/config";
import { useAppToast } from "../../../lib/toast/useAppToast";

interface UseContactPhotoUploadOptions {
  contactId: string;
  onAvatarUpdated: (avatarUrl: string | null) => void;
}

export function useContactPhotoUpload({
  contactId,
  onAvatarUpdated,
}: UseContactPhotoUploadOptions) {
  const tMobileContactIdentity = useMobileContactIdentityTranslations();
  const t = useCommonTranslations();
  const { showToast } = useAppToast();
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const [isRemoveConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const ensureOnline = useCallback(async (): Promise<boolean> => {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected) {
      return true;
    }
    showToast({
      description: tMobileContactIdentity("PhotoRequiresConnection"),
      headline: t("feedback.errorTitle"),
      type: "error",
    });
    return false;
  }, [showToast, t, tMobileContactIdentity]);

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
            err instanceof Error ? err.message : tMobileContactIdentity("PhotoUploadFailed"),
          headline: t("feedback.errorTitle"),
          type: "error",
        });
      } finally {
        setIsPhotoBusy(false);
      }
    },
    [contactId, ensureOnline, onAvatarUpdated, showToast, t, tMobileContactIdentity],
  );

  const choosePhotoFromLibrary = useCallback(async () => {
    if (!(await ensureOnline())) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({
        description: tMobileContactIdentity("PhotoPermissionDenied"),
        headline: t("feedback.errorTitle"),
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
        description: tMobileContactIdentity("InvalidPhotoType"),
        headline: t("feedback.errorTitle"),
        type: "error",
      });
      return;
    }

    await uploadPhoto(asset.uri, mimeType);
  }, [ensureOnline, showToast, t, uploadPhoto, tMobileContactIdentity]);

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
        description: tMobileContactIdentity("PhotoRemoveFailed"),
        headline: t("feedback.errorTitle"),
        type: "error",
      });
    } finally {
      setIsPhotoBusy(false);
    }
  }, [contactId, ensureOnline, onAvatarUpdated, showToast, t, tMobileContactIdentity]);
  return {
    choosePhotoFromLibrary,
    isPhotoBusy,
    isRemoveConfirmOpen,
    removePhoto,
    setRemoveConfirmOpen,
  };
}
