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
import type { Contact } from "@bondery/types";
import { countryCodes, parsePhoneNumber } from "@/lib/phoneHelpers";
import { createSocialMediaUrl } from "@/lib/socialMediaHelpers";

interface SocialMediaSectionProps {
  contact: Contact;
  editedValues: Record<string, string>;
  savingField: string | null;
  handleChange: (field: string, value: string) => void;
  handleBlur: (field: string) => void;
  whatsappPrefix: string;
  signalPrefix: string;
  setWhatsappPrefix: (value: string) => void;
  setSignalPrefix: (value: string) => void;
}

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
  editedValues,
  savingField,
  handleChange,
  handleBlur,
  whatsappPrefix,
  signalPrefix,
  setWhatsappPrefix,
  setSignalPrefix,
}: SocialMediaSectionProps) {
  const handleNumberChange = (
    field: "whatsapp" | "signal",
    value: string,
    prefixSetter: (v: string) => void,
  ) => {
    const parsed = parsePhoneNumber(value);
    if (parsed && value.includes("+")) {
      prefixSetter(parsed.dialCode);
      handleChange(field, parsed.number);
      return;
    }
    handleChange(field, value);
  };

  return (
    <div>
      <Text size="sm" fw={600} mb="md">
        Social Media
      </Text>
      <Stack gap="sm">
        {/* LinkedIn */}
        <Group gap="sm" align="center">
          <ActionIcon
            variant="light"
            color="blue"
            component="a"
            href={contact.linkedin ? createSocialMediaUrl("linkedin", contact.linkedin) : undefined}
            target="_blank"
            disabled={!contact.linkedin}
          >
            <IconBrandLinkedin size={18} />
          </ActionIcon>
          <TextInput
            placeholder="LinkedIn username or URL"
            value={editedValues.linkedin || ""}
            onChange={(e) => handleChange("linkedin", e.target.value)}
            onBlur={() => handleBlur("linkedin")}
            style={{ flex: 1 }}
            rightSection={savingField === "linkedin" ? <Loader size="xs" /> : null}
            disabled={savingField === "linkedin"}
          />
        </Group>

        {/* Instagram */}
        <Group gap="sm" align="center">
          <ActionIcon
            variant="light"
            color="pink"
            component="a"
            href={
              contact.instagram ? createSocialMediaUrl("instagram", contact.instagram) : undefined
            }
            target="_blank"
            disabled={!contact.instagram}
          >
            <IconBrandInstagram size={18} />
          </ActionIcon>
          <TextInput
            placeholder="Instagram username or URL"
            value={editedValues.instagram || ""}
            onChange={(e) => handleChange("instagram", e.target.value)}
            onBlur={() => handleBlur("instagram")}
            style={{ flex: 1 }}
            rightSection={savingField === "instagram" ? <Loader size="xs" /> : null}
            disabled={savingField === "instagram"}
          />
        </Group>

        {/* Facebook */}
        <Group gap="sm" align="center">
          <ActionIcon
            variant="light"
            color="blue"
            component="a"
            href={contact.facebook ? createSocialMediaUrl("facebook", contact.facebook) : undefined}
            target="_blank"
            disabled={!contact.facebook}
          >
            <IconBrandFacebook size={18} />
          </ActionIcon>
          <TextInput
            placeholder="Facebook username or URL"
            value={editedValues.facebook || ""}
            onChange={(e) => handleChange("facebook", e.target.value)}
            onBlur={() => handleBlur("facebook")}
            style={{ flex: 1 }}
            rightSection={savingField === "facebook" ? <Loader size="xs" /> : null}
            disabled={savingField === "facebook"}
          />
        </Group>

        {/* WhatsApp */}
        <Group gap="sm" align="center" wrap="nowrap">
          <ActionIcon
            variant="light"
            color="green"
            component="a"
            href={contact.whatsapp ? createSocialMediaUrl("whatsapp", contact.whatsapp) : undefined}
            target="_blank"
            disabled={!contact.whatsapp}
          >
            <IconBrandWhatsapp size={18} />
          </ActionIcon>
          <PrefixSelect value={whatsappPrefix} onChange={setWhatsappPrefix} />
          <TextInput
            placeholder="WhatsApp number or URL"
            value={editedValues.whatsapp || ""}
            onChange={(e) => handleNumberChange("whatsapp", e.target.value, setWhatsappPrefix)}
            onBlur={() => handleBlur("whatsapp")}
            style={{ flex: 1 }}
            rightSection={savingField === "whatsapp" ? <Loader size="xs" /> : null}
            disabled={savingField === "whatsapp"}
          />
        </Group>

        {/* Signal */}
        <Group gap="sm" align="center" wrap="nowrap">
          <ActionIcon
            variant="light"
            color="cyan"
            component="a"
            href={
              contact.signal
                ? `signal://signal.me/#p/${contact.signal.replace(/\D/g, "")}`
                : undefined
            }
            disabled={!contact.signal}
          >
            <Image src="/icons/signal.svg" alt="Signal" width={18} height={18} />
          </ActionIcon>
          <PrefixSelect value={signalPrefix} onChange={setSignalPrefix} />
          <TextInput
            placeholder="Signal number"
            value={editedValues.signal || ""}
            onChange={(e) => handleNumberChange("signal", e.target.value, setSignalPrefix)}
            onBlur={() => handleBlur("signal")}
            style={{ flex: 1 }}
            rightSection={savingField === "signal" ? <Loader size="xs" /> : null}
            disabled={savingField === "signal"}
          />
        </Group>

        {/* Website */}
        <Group gap="sm" align="center">
          <ActionIcon
            variant="light"
            color="gray"
            component="a"
            href={contact.website || undefined}
            target="_blank"
            disabled={!contact.website}
          >
            <IconWorld size={18} />
          </ActionIcon>
          <TextInput
            placeholder="Website URL"
            value={editedValues.website || ""}
            onChange={(e) => handleChange("website", e.target.value)}
            onBlur={() => handleBlur("website")}
            style={{ flex: 1 }}
            rightSection={savingField === "website" ? <Loader size="xs" /> : null}
            disabled={savingField === "website"}
          />
        </Group>
      </Stack>
    </div>
  );
}
