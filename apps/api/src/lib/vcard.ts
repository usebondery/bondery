/**
 * vCard Generation Utility
 * Generates vCard 4.0 formatted files from contact data
 */

import type { Contact, PhoneEntry, EmailEntry } from "@bondery/types";

/**
 * IMPP (Instant Messaging and Presence Protocol) URI scheme mappings
 * Maps social platform names to their corresponding URI schemes and labels
 *
 * Reference: RFC 6350 Section 6.4.3
 * https://datatracker.ietf.org/doc/html/rfc6350#section-6.4.3
 */
const IMPP_MAPPINGS: Record<string, { scheme: string; label: string; urlFormat?: string }> = {
  whatsapp: { scheme: "whatsapp", label: "WhatsApp", urlFormat: "https://wa.me/" },
  signal: { scheme: "signal", label: "Signal", urlFormat: "https://signal.me/#p/" },
  linkedin: { scheme: "https", label: "LinkedIn" },
  instagram: { scheme: "instagram", label: "Instagram", urlFormat: "https://instagram.com/" },
  facebook: { scheme: "messenger", label: "Messenger", urlFormat: "https://m.me/" },
};

/**
 * Fetch and convert image to base64
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
  } catch (error) {
    console.error("Error fetching image for vCard:", error);
    return null;
  }
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatVCardDate(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  } catch {
    return null;
  }
}

function formatVCardTimestamp(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  } catch {
    return null;
  }
}

export async function generateVCard(contact: Contact): Promise<string> {
  const lines: string[] = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:4.0");
  lines.push("PRODID:-//BONDERY//NONSGML Bondery v1.0 //EN");
  lines.push("KIND:individual");

  const lastName = contact.lastName ? escapeVCardValue(contact.lastName) : "";
  const firstName = escapeVCardValue(contact.firstName);
  const middleName = contact.middleName ? escapeVCardValue(contact.middleName) : "";
  lines.push(`N:${lastName};${firstName};${middleName};;`);

  const fullName = [contact.firstName, contact.middleName, contact.lastName]
    .filter(Boolean)
    .join(" ");
  lines.push(`FN:${escapeVCardValue(fullName)}`);

  if (contact.nickname) {
    lines.push(`NICKNAME:${escapeVCardValue(contact.nickname)}`);
  }

  lines.push(`UID:urn:uuid:${contact.id}`);

  if (contact.title) {
    lines.push(`TITLE:${escapeVCardValue(contact.title)}`);
  }

  // Add emails with TYPE and PREF properties
  const emails = Array.isArray(contact.emails) ? (contact.emails as EmailEntry[]) : [];
  if (emails.length > 0) {
    for (const emailEntry of emails) {
      if (emailEntry.value && emailEntry.value.trim()) {
        const typeParam = emailEntry.type === "work" ? "WORK" : "HOME";
        const prefParam = emailEntry.preferred ? ";PREF=1" : "";
        lines.push(`EMAIL;TYPE=${typeParam}${prefParam}:${emailEntry.value.trim()}`);
      }
    }
  }

  // Add phones with TYPE and PREF properties
  const phones = Array.isArray(contact.phones) ? (contact.phones as PhoneEntry[]) : [];
  if (phones.length > 0) {
    for (const phoneEntry of phones) {
      if (phoneEntry.prefix && phoneEntry.value && phoneEntry.value.trim()) {
        const typeParam = phoneEntry.type === "work" ? "WORK" : "HOME";
        const prefParam = phoneEntry.preferred ? ";PREF=1" : "";
        const fullPhoneNumber = `${phoneEntry.prefix}${phoneEntry.value.trim()}`;
        lines.push(`TEL;TYPE=${typeParam}${prefParam}:${fullPhoneNumber}`);
      }
    }
  }

  if (contact.website) {
    lines.push(`URL:${contact.website}`);
  }

  const birthdate = formatVCardDate(contact.birthdate);
  if (birthdate) {
    lines.push(`BDAY:${birthdate}`);
  }

  if (contact.latitude !== null && contact.longitude !== null) {
    lines.push(`GEO:geo:${contact.latitude},${contact.longitude}`);
  }

  if (contact.timezone) {
    lines.push(`TZ:${contact.timezone}`);
  }

  if (contact.description) {
    lines.push(`NOTE:${escapeVCardValue(contact.description)}`);
  }

  if (contact.language) {
    lines.push(`LANG:${contact.language}`);
  }

  if (contact.gender) {
    lines.push(`GENDER:${contact.gender}`);
  }

  // Add IMPP properties for social media accounts
  const socialPlatforms = Object.keys(IMPP_MAPPINGS) as Array<keyof Contact>;
  for (const platform of socialPlatforms) {
    const socialValue = contact[platform];
    if (socialValue && typeof socialValue === "string" && socialValue.trim()) {
      const trimmedValue = socialValue.trim();
      const mapping = IMPP_MAPPINGS[platform];

      // Handle phone number based platforms (WhatsApp, Signal)
      if (platform === "whatsapp" || platform === "signal") {
        // Add platform-specific scheme IMPP entry
        lines.push(`IMPP:${mapping.scheme}:${trimmedValue}`);

        // Add URL-based IMPP entry if urlFormat is defined
        if (mapping.urlFormat) {
          // For phone numbers, remove + and use plain number for URL
          const phoneForUrl = trimmedValue.replace(/^\+/, "");
          lines.push(`IMPP:${mapping.urlFormat}${phoneForUrl}`);
        }
      } else if (platform === "linkedin") {
        // LinkedIn uses https scheme - build full URL
        const linkedinUrl = trimmedValue.startsWith("http")
          ? trimmedValue
          : `https://linkedin.com/in/${trimmedValue}`;
        lines.push(`IMPP:${linkedinUrl}`);
      } else if (platform === "instagram") {
        // Instagram - add both scheme and URL format
        lines.push(`IMPP:${mapping.scheme}:${trimmedValue}`);

        if (mapping.urlFormat) {
          const instagramUrl = trimmedValue.startsWith("http")
            ? trimmedValue
            : `${mapping.urlFormat}${trimmedValue}`;
          lines.push(`IMPP:${instagramUrl}`);
        }
      } else if (platform === "facebook") {
        // Facebook Messenger - add both scheme and URL format
        lines.push(`IMPP:${mapping.scheme}:${trimmedValue}`);

        if (mapping.urlFormat) {
          const messengerUrl = trimmedValue.startsWith("http")
            ? trimmedValue
            : `${mapping.urlFormat}${trimmedValue}`;
          lines.push(`IMPP:${messengerUrl}`);
        }
      }
    }
  }

  if (contact.pgpPublicKey) {
    const pgpKey = contact.pgpPublicKey.trim();
    const base64Key = Buffer.from(pgpKey).toString("base64");
    lines.push(`KEY:data:application/pgp-keys;base64,${base64Key}`);
  }

  // Add PHOTO property if avatar exists
  if (contact.avatar) {
    try {
      const base64Image = await fetchImageAsBase64(contact.avatar);
      if (base64Image) {
        lines.push(`PHOTO;ENCODING=BASE64;TYPE=JPEG:${base64Image}`);
      }
    } catch (error) {
      console.error("Failed to fetch avatar for vCard:", error);
    }
  }

  // Add RELATED property for self-contact
  if (contact.myself === true) {
    lines.push(`RELATED;TYPE=me:urn:uuid:${contact.id}`);
  }

  const revision = formatVCardTimestamp(contact.createdAt);
  if (revision) {
    lines.push(`REV:${revision}`);
  }

  lines.push(`CLIENTPIDMAP:1;urn:uuid:${contact.id}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}
