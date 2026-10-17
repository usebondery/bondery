import type { Contact } from "@bondery/schemas";
import { updateContactIdentitySchema } from "@bondery/schemas";
import { IconBriefcase, IconCheck, IconTrash } from "@tabler/icons-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  useCommonTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import { SheetTextField } from "../../../components/form";
import { PersonAvatar } from "../../../components/PersonAvatar";
import { isHttpAvatarUri } from "../../../components/personAvatarSources";
import { Sheet, type SheetAction } from "../../../components/ui/Sheet";
import { fetchSettings } from "../../../lib/api/client";
import { INPUT_MAX_LENGTHS, UI_TIMING_MS } from "../../../lib/config";
import { updateContact } from "../../../lib/domains/contacts";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useSheetLocalSubmit } from "../../../lib/forms/useSheetLocalSubmit";
import type { NativeTextInputRef } from "../../../lib/native-host-refs";
import { useShowErrorToast } from "../../../lib/toast/useShowErrorToast";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { useContactPhotoUpload } from "../hooks/useContactPhotoUpload";
import { AvatarPhotoOverlayControls, avatarPhotoOverlayStyles } from "./AvatarPhotoOverlayControls";

interface EditIdentitySheetProps {
  contact: Contact;
  isMyselfMode?: boolean;
  onClose: () => void;
  onContactUpdated: (contact: Contact) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function EditIdentitySheet({
  open,
  contact,
  isMyselfMode = false,
  onOpenChange: _onOpenChange,
  onClose,
  onContactUpdated,
}: EditIdentitySheetProps) {
  const tMobileContactIdentity = useMobileContactIdentityTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const showErrorToast = useShowErrorToast();
  const firstNameRef = useRef<NativeTextInputRef>(null);

  // Keep a stable ref so callbacks like onAvatarUpdated never capture a stale contact.
  const contactRef = useRef(contact);

  useEffect(() => {
    contactRef.current = contact;
  }, [contact]);

  const [avatarUri, setAvatarUri] = useState<string | null>(contact.avatar);

  const {
    control,
    handleSubmit,
    formState: { isDirty, isValid },
  } = useSheetForm({
    getDefaultValues: () => ({
      firstName: contact.firstName ?? "",
      headline: contact.headline ?? "",
      lastName: contact.lastName ?? "",
      middleName: contact.middleName ?? "",
    }),
    mode: "onChange",
    open,
    schema: updateContactIdentitySchema,
  });

  // Reset avatar URI to the latest confirmed contact avatar each time the sheet opens.
  useEffect(() => {
    if (!open) {
      return;
    }
    setAvatarUri(contactRef.current.avatar);
  }, [open]);

  const {
    isPhotoBusy,
    isRemoveConfirmOpen,
    setRemoveConfirmOpen,
    choosePhotoFromLibrary,
    removePhoto,
  } = useContactPhotoUpload({
    contactId: contact.id,
    onAvatarUpdated: (url) => {
      setAvatarUri(url);
      onContactUpdated({ ...contactRef.current, avatar: url });
      if (isMyselfMode) {
        void fetchSettings();
      }
    },
  });

  // Auto-focus first field after the sheet animation settles.
  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => {
      firstNameRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);
    return () => clearTimeout(timer);
  }, [open]);

  const hasAvatar = Boolean(avatarUri);

  const headlineLeadingIcon = <IconBriefcase size={18} stroke={colors.iconSecondary} />;

  function performSave(values: Parameters<typeof updateContact>[1]) {
    return updateContact(contact.id, values, contact.updatedAt ?? undefined);
  }

  const { isSubmitting, submit } = useSheetLocalSubmit(handleSubmit, {
    onClose,
    onError: showErrorToast,
    onSuccess: onContactUpdated,
    perform: performSave,
  });

  const isBusy = isSubmitting || isPhotoBusy;
  const canSubmit = isValid && isDirty && !isBusy;

  function requestClose() {
    if (isBusy) {
      return;
    }
    onClose();
  }

  const title = isMyselfMode
    ? tMobileContactIdentity("EditYourProfile")
    : tMobileContactIdentity("EditProfile");

  const primaryAction: SheetAction = {
    disabled: !canSubmit,
    icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
    label: tMobileContactIdentity("SaveChanges"),
    loading: isSubmitting,
    loadingText: t("feedback.saving"),
    onPress: submit,
    tone: "primary",
    variant: "filled",
  };

  return (
    <>
      <Sheet
        actions={[primaryAction]}
        isBusy={isBusy}
        onClose={requestClose}
        opened={open}
        title={title}
      >
        <View style={styles.avatarSection}>
          <View style={avatarPhotoOverlayStyles.avatarFrame}>
            <PersonAvatar
              accessibilityLabel={tMobileContactIdentity("ChangePhoto")}
              disabled={isBusy}
              onPress={() => void choosePhotoFromLibrary()}
              person={contact}
              size={MOBILE_LAYOUT.avatar.editor}
              skipLocalFile={avatarUri != null && !isHttpAvatarUri(avatarUri)}
              uri={avatarUri}
            />

            <AvatarPhotoOverlayControls
              disabled={isBusy}
              onChangePhoto={() => void choosePhotoFromLibrary()}
              onRemovePhoto={() => setRemoveConfirmOpen(true)}
              showRemove={hasAvatar}
            />
          </View>
        </View>

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("FirstNameLabel")}
          control={control as never}
          editable={!isBusy}
          inputRef={firstNameRef}
          maxLength={INPUT_MAX_LENGTHS.firstName}
          name="firstName"
          placeholder={tMobileContactIdentity("FirstNameLabel")}
          returnKeyType="next"
        />

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("MiddleNameLabel")}
          control={control as never}
          editable={!isBusy}
          maxLength={INPUT_MAX_LENGTHS.middleName}
          name="middleName"
          placeholder={tMobileContactIdentity("MiddleNameLabel")}
          returnKeyType="next"
        />

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("LastNameLabel")}
          control={control as never}
          editable={!isBusy}
          maxLength={INPUT_MAX_LENGTHS.lastName}
          name="lastName"
          placeholder={tMobileContactIdentity("LastNameLabel")}
          returnKeyType="next"
        />

        <SheetTextField
          accessibilityLabel={tMobileContactIdentity("HeadlineLabel")}
          control={control as never}
          editable={!isBusy}
          leadingIcon={headlineLeadingIcon}
          maxLength={INPUT_MAX_LENGTHS.headline}
          name="headline"
          onSubmitEditing={submit}
          placeholder={tMobileContactIdentity("HeadlineLabel")}
          returnKeyType="done"
        />
      </Sheet>

      <Sheet
        actions={[
          {
            disabled: isPhotoBusy,
            label: t("actions.cancel"),
            onPress: () => setRemoveConfirmOpen(false),
            tone: "neutral",
            variant: "outline",
          },
          {
            disabled: isPhotoBusy,
            icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
            label: tMobileContactIdentity("RemovePhoto"),
            loading: isPhotoBusy,
            loadingText: t("feedback.removing"),
            onPress: () => void removePhoto(),
            tone: "danger",
            variant: "filled",
          },
        ]}
        isBusy={isPhotoBusy}
        onClose={() => setRemoveConfirmOpen(false)}
        onOpenChange={setRemoveConfirmOpen}
        opened={isRemoveConfirmOpen}
        title={tMobileContactIdentity("RemovePhotoConfirmTitle")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: "center",
    marginBottom: 4,
  },
});
