"use client";

import { ActionIcon, Group, Loader, Select, Stack, Text, TextInput } from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconWorld,
} from "@tabler/icons-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Contact } from "@bondery/types";
import { countryCodes, parsePhoneNumber } from "@/lib/phoneHelpers";
import { createSocialMediaUrl } from "@/lib/socialMediaHelpers";
import { ActionIconLink } from "@bondery/mantine-next";

interface SocialMediaSectionProps {
  contact: Contact;
  savingField: string | null;
  onSaveField: (field: string, value: string) => void;
  whatsappPrefix: string;
  signalPrefix: string;
  setWhatsappPrefix: (value: string) => void;
  setSignalPrefix: (value: string) => void;
}

type SocialFieldKey = "linkedin" | "instagram" | "facebook" | "website" | "whatsapp" | "signal";

type SocialFieldValues = Record<SocialFieldKey, string>;

function PrefixSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = Array.from(
    new Map(
      countryCodes.map((country) => [
        country.dialCode,
        {
          value: country.dialCode,
          label: country.dialCode,
        },
      ]),
    ).values(),
  );

  const selected = countryCodes.find((c) => c.dialCode === value);

  return (
    <Select
      value={value}
      onChange={(val) => onChange(val || "+1")}
      data={options}
      renderOption={({ option }) => {
        const country = countryCodes.find((c) => c.dialCode === option.value);
        return (
          <Group gap="xs">
            <span className={`fi fi-${country?.flag || "us"}`} />
            <span>{option.value}</span>
          </Group>
        );
      }}
      leftSection={<span className={`fi fi-${selected?.flag || "us"}`} />}
      searchable
      style={{ width: 100 }}
      size="sm"
    />
  );
}

export function SocialMediaSection({
  contact,
  savingField,
  onSaveField,
  whatsappPrefix,
  signalPrefix,
  setWhatsappPrefix,
  setSignalPrefix,
}: SocialMediaSectionProps) {
  const [values, setValues] = useState<SocialFieldValues>({
    linkedin: contact.linkedin || "",
    instagram: contact.instagram || "",
    facebook: contact.facebook || "",
    website: contact.website || "",
    whatsapp: contact.whatsapp || "",
    signal: contact.signal || "",
  });

  useEffect(() => {
    setValues({
      linkedin: contact.linkedin || "",
      instagram: contact.instagram || "",
      facebook: contact.facebook || "",
      website: contact.website || "",
      whatsapp: contact.whatsapp || "",
      signal: contact.signal || "",
    });
  }, [
    contact.linkedin,
    contact.instagram,
    contact.facebook,
    contact.website,
    contact.whatsapp,
    contact.signal,
  ]);

  const handleValueChange = (field: SocialFieldKey, value: string) => {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const getWebsiteUrl = (website: string | null): string | undefined => {
    if (!website) {
      return undefined;
    }

    if (website.startsWith("http://") || website.startsWith("https://")) {
      return website;
    }

    return `https://${website}`;
  };

  const handleNumberChange = (
    field: "whatsapp" | "signal",
    value: string,
    prefixSetter: (v: string) => void,
  ) => {
    const parsed = parsePhoneNumber(value);
    if (parsed && value.includes("+")) {
      prefixSetter(parsed.dialCode);
      handleValueChange(field, parsed.number);
      return;
    }
    handleValueChange(field, value);
  };

  return (
    <div>
      <Text size="sm" fw={600} mb="md">
        Social Media
      </Text>
      <Stack gap="sm">
        {/* LinkedIn */}
        <Group gap="sm" align="center">
          <ActionIconLink
            variant="light"
            color="blue"
            href={contact.linkedin ? createSocialMediaUrl("linkedin", contact.linkedin) : undefined}
            target="_blank"
            disabled={!contact.linkedin}
            ariaLabel="LinkedIn"
          >
            <IconBrandLinkedin size={18} />
          </ActionIconLink>
          <TextInput
            placeholder="LinkedIn username or URL"
            value={values.linkedin}
            onChange={(e) => handleValueChange("linkedin", e.target.value)}
            onBlur={() => onSaveField("linkedin", values.linkedin)}
            style={{ flex: 1 }}
            rightSection={savingField === "linkedin" ? <Loader size="xs" /> : null}
            disabled={savingField === "linkedin"}
          />
        </Group>

        {/* Instagram */}
        <Group gap="sm" align="center">
          <ActionIconLink
            variant="light"
            color="pink"
            href={
              contact.instagram ? createSocialMediaUrl("instagram", contact.instagram) : undefined
            }
            target="_blank"
            disabled={!contact.instagram}
            ariaLabel="Instagram"
          >
            <IconBrandInstagram size={18} />
          </ActionIconLink>
          <TextInput
            placeholder="Instagram username or URL"
            value={values.instagram}
            onChange={(e) => handleValueChange("instagram", e.target.value)}
            onBlur={() => onSaveField("instagram", values.instagram)}
            style={{ flex: 1 }}
            rightSection={savingField === "instagram" ? <Loader size="xs" /> : null}
            disabled={savingField === "instagram"}
          />
        </Group>

        {/* Facebook */}
        <Group gap="sm" align="center">
          <ActionIconLink
            variant="light"
            color="blue"
            href={contact.facebook ? createSocialMediaUrl("facebook", contact.facebook) : undefined}
            target="_blank"
            disabled={!contact.facebook}
            ariaLabel="Facebook"
          >
            <IconBrandFacebook size={18} />
          </ActionIconLink>
          <TextInput
            placeholder="Facebook username or URL"
            value={values.facebook}
            onChange={(e) => handleValueChange("facebook", e.target.value)}
            onBlur={() => onSaveField("facebook", values.facebook)}
            style={{ flex: 1 }}
            rightSection={savingField === "facebook" ? <Loader size="xs" /> : null}
            disabled={savingField === "facebook"}
          />
        </Group>

        {/* WhatsApp */}
        <Group gap="sm" align="center" wrap="nowrap">
          <ActionIconLink
            variant="light"
            color="green"
            href={contact.whatsapp ? createSocialMediaUrl("whatsapp", contact.whatsapp) : undefined}
            target="_blank"
            disabled={!contact.whatsapp}
            ariaLabel="WhatsApp"
          >
            <IconBrandWhatsapp size={18} />
          </ActionIconLink>
          <PrefixSelect value={whatsappPrefix} onChange={setWhatsappPrefix} />
          <TextInput
            placeholder="WhatsApp number or URL"
            value={values.whatsapp}
            onChange={(e) => handleNumberChange("whatsapp", e.target.value, setWhatsappPrefix)}
            onBlur={() => onSaveField("whatsapp", values.whatsapp)}
            style={{ flex: 1 }}
            rightSection={savingField === "whatsapp" ? <Loader size="xs" /> : null}
            disabled={savingField === "whatsapp"}
          />
        </Group>

        {/* Signal */}
        <Group gap="sm" align="center" wrap="nowrap">
          <ActionIconLink
            variant="light"
            color="cyan"
            href={
              contact.signal
                ? `signal://signal.me/#p/${contact.signal.replace(/\D/g, "")}`
                : undefined
            }
            disabled={!contact.signal}
            ariaLabel="Signal"
          >
            <Image src="/icons/signal.svg" alt="Signal" width={18} height={18} />
          </ActionIconLink>
          <PrefixSelect value={signalPrefix} onChange={setSignalPrefix} />
          <TextInput
            placeholder="Signal number"
            value={values.signal}
            onChange={(e) => handleNumberChange("signal", e.target.value, setSignalPrefix)}
            onBlur={() => onSaveField("signal", values.signal)}
            style={{ flex: 1 }}
            rightSection={savingField === "signal" ? <Loader size="xs" /> : null}
            disabled={savingField === "signal"}
          />
        </Group>

        {/* Website */}
        <Group gap="sm" align="center">
          <ActionIconLink
            variant="light"
            color="gray"
            href={getWebsiteUrl(contact.website)}
            target="_blank"
            disabled={!contact.website}
            ariaLabel="Website"
          >
            <IconWorld size={18} />
          </ActionIconLink>
          <TextInput
            placeholder="Website URL"
            value={values.website}
            onChange={(e) => handleValueChange("website", e.target.value)}
            onBlur={() => onSaveField("website", values.website)}
            style={{ flex: 1 }}
            rightSection={savingField === "website" ? <Loader size="xs" /> : null}
            disabled={savingField === "website"}
          />
        </Group>
      </Stack>
    </div>
  );
}
