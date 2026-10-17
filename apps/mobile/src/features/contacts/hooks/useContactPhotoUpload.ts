import * as ImagePicker from "expo-image-picker";
import * as Network from "expo-network";
import { useCallback, useState } from "react";
import {
  useCommonTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import { deleteContactPhoto, uploadContactPhoto } from "../../../lib/api/client";
import { AVATAR_UPLOAD } from "../../../lib/config";
import {
  copyPickerFileToAvatar,
  deleteLocalAvatarFile,
  markLocalAvatarAfterUpload,
  markLocalAvatarRemoved,
} from "../../../lib/sync/avatar-files";
import { notifications } from "../../../lib/toast/notifications";
import { useShowErrorToast } from "../../../lib/toast/useShowErrorToast";

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
  const showErrorToast = useShowErrorToast();
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const [isRemoveConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const ensureOnline = useCallback(async (): Promise<boolean> => {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected) {
      return true;
    }
    notifications.show({
      message: tMobileContactIdentity("PhotoRequiresConnection"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
    return false;
  }, [t, tMobileContactIdentity]);

  const uploadPhoto = useCallback(
    async (uri: string, mimeType: string) => {
      if (!(await ensureOnline())) {
        return;
      }

      setIsPhotoBusy(true);
      try {
        const { avatarUrl } = await uploadContactPhoto(contactId, uri, mimeType);
        try {
          await copyPickerFileToAvatar(contactId, uri);
          markLocalAvatarAfterUpload(contactId, avatarUrl);
        } catch {
          // Pull downloads the stored JPEG if the local copy fails.
        }
        onAvatarUpdated(avatarUrl);
      } catch (err) {
        showErrorToast(err);
      } finally {
        setIsPhotoBusy(false);
      }
    },
    [contactId, ensureOnline, onAvatarUpdated, showErrorToast],
  );

  const choosePhotoFromLibrary = useCallback(async () => {
    if (!(await ensureOnline())) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notifications.show({
        message: tMobileContactIdentity("PhotoPermissionDenied"),
        title: t("feedback.errorTitle"),
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
      notifications.show({
        message: tMobileContactIdentity("InvalidPhotoType"),
        title: t("feedback.errorTitle"),
        type: "error",
      });
      return;
    }

    await uploadPhoto(asset.uri, mimeType);
  }, [ensureOnline, t, uploadPhoto, tMobileContactIdentity]);

  const removePhoto = useCallback(async () => {
    if (!(await ensureOnline())) {
      return;
    }

    setIsPhotoBusy(true);
    try {
      await deleteContactPhoto(contactId);
      try {
        markLocalAvatarRemoved(contactId);
      } catch {
        deleteLocalAvatarFile(contactId);
      }
      onAvatarUpdated(null);
      setRemoveConfirmOpen(false);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setIsPhotoBusy(false);
    }
  }, [contactId, ensureOnline, onAvatarUpdated, showErrorToast]);
  return {
    choosePhotoFromLibrary,
    isPhotoBusy,
    isRemoveConfirmOpen,
    removePhoto,
    setRemoveConfirmOpen,
  };
}
