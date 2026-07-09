"use client";

import { createSocialUrl } from "@bondery/helpers";
import { ActionIconLink } from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { Group, Space, Tooltip } from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconMail,
  IconPhone,
} from "@tabler/icons-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { SOCIAL_ACTION_ORDER, type SocialActionKey } from "@/lib/contacts/socialActionTooltips";
import { useSocialActionTooltips } from "@/lib/i18n/useSocialActionTooltips";
import { getPreferredEmail, getPreferredPhone } from "./utils/contacts-table-channel-helpers";

interface SocialLink {
  color: string;
  disabled?: boolean;
  href?: string;
  icon: ReactNode;
  key: SocialActionKey;
  label: string;
}

export function ContactSocialIcons({ contact }: { contact: Contact }) {
  const { getSocialActionTooltip, getSocialActionLabel } = useSocialActionTooltips();

  const socialByKey: Record<SocialActionKey, SocialLink> = useMemo(
    () => ({
      email: {
        color: "red",
        disabled: (() => {
          const emails = Array.isArray(contact.emails) ? contact.emails : [];
          return emails.length === 0;
        })(),
        href: (() => {
          const preferredEmail = getPreferredEmail(contact.emails);
          if (preferredEmail) {
            return `mailto:${preferredEmail.value}`;
          }
        })(),
        icon: <IconMail size={18} />,
        key: "email",
        label: getSocialActionLabel("email"),
      },
      facebook: {
        color: "blue",
        disabled: !contact.facebook,
        href: contact.facebook ? createSocialUrl("facebook", contact.facebook) : undefined,
        icon: <IconBrandFacebook size={18} />,
        key: "facebook",
        label: getSocialActionLabel("facebook"),
      },
      instagram: {
        color: "pink",
        disabled: !contact.instagram,
        href: contact.instagram ? createSocialUrl("instagram", contact.instagram) : undefined,
        icon: <IconBrandInstagram size={18} />,
        key: "instagram",
        label: getSocialActionLabel("instagram"),
      },
      linkedin: {
        color: "blue",
        disabled: !contact.linkedin,
        href: contact.linkedin ? createSocialUrl("linkedin", contact.linkedin) : undefined,
        icon: <IconBrandLinkedin size={18} />,
        key: "linkedin",
        label: getSocialActionLabel("linkedin"),
      },
      phone: {
        color: "blue",
        disabled: (() => {
          const phones = Array.isArray(contact.phones) ? contact.phones : [];
          return phones.length === 0;
        })(),
        href: (() => {
          const preferredPhone = getPreferredPhone(contact.phones);
          if (preferredPhone) {
            return `tel:${preferredPhone.prefix || ""}${preferredPhone.value}`;
          }
        })(),
        icon: <IconPhone size={18} />,
        key: "phone",
        label: getSocialActionLabel("phone"),
      },
      signal: {
        color: "indigo",
        disabled: !contact.signal,
        href: contact.signal || undefined,
        icon: <Image alt="Signal" height={18} src="/icons/brands/signal.svg" width={18} />,
        key: "signal",
        label: getSocialActionLabel("signal"),
      },
      whatsapp: {
        color: "green",
        disabled: !contact.whatsapp,
        href: contact.whatsapp ? createSocialUrl("whatsapp", contact.whatsapp) : undefined,
        icon: <IconBrandWhatsapp size={18} />,
        key: "whatsapp",
        label: getSocialActionLabel("whatsapp"),
      },
    }),
    [contact, getSocialActionLabel],
  );

  const socials: SocialLink[] = SOCIAL_ACTION_ORDER.map((key) => socialByKey[key]);

  return (
    <Group className="gap-1!" wrap="nowrap">
      {socials.map((social) => {
        if (!social || social.disabled) {
          return (
            <Space
              h={"calc(1.75rem * var(--mantine-scale))"}
              key={social.key}
              w={"calc(1.75rem * var(--mantine-scale))"}
            />
          );
        }

        return (
          <Tooltip
            key={social.key}
            label={getSocialActionTooltip(social.key, contact.firstName)}
            withArrow
          >
            <span>
              <ActionIconLink
                ariaLabel={social.label}
                color={social.color}
                href={social.href}
                icon={social.icon}
                size="md"
                target={social.href?.startsWith("http") ? "_blank" : undefined}
                variant="light"
              />
            </span>
          </Tooltip>
        );
      })}
    </Group>
  );
}
