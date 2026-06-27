import type { Contact } from "@bondery/schemas";
import { File, Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import { fetchContactVCard } from "../api/client";

const VCARD_MIME_TYPE = "text/vcard" as const;

export class ShareUnavailableError extends Error {
  constructor() {
    super("Sharing is not available on this device");
    this.name = "ShareUnavailableError";
  }
}

type ShareContactVCardInput = {
  contactId: string;
  contact: Pick<Contact, "firstName" | "lastName">;
  dialogTitle: string;
};

export async function shareContactVCard(input: ShareContactVCardInput): Promise<void> {
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new ShareUnavailableError();
  }

  const { content, filename } = await fetchContactVCard(input.contactId, input.contact);
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);

  const shareOptions = {
    mimeType: VCARD_MIME_TYPE,
    UTI: "public.vcard",
    dialogTitle: input.dialogTitle,
  };
  await Sharing.shareAsync(file.uri, shareOptions);
}
