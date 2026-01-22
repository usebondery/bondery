import { Group, TextInput, ActionIcon, Loader } from "@mantine/core";
import { type ReactNode } from "react";
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandFacebook,
  IconWorld,
} from "@tabler/icons-react";
import { extractUsername, createSocialMediaUrl } from "@/lib/socialMediaHelpers";

type SocialPlatform = "linkedin" | "instagram" | "facebook" | "website";

interface SocialMediaInputProps {
  platform: SocialPlatform;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  autoExtractUsername?: boolean;
  error?: ReactNode;
  displayLabel?: boolean;
}

export function validateSocialMediaInput(value: string, platform: SocialPlatform): string | null {
  if (!value || value.trim().length === 0) {
    return null; // Empty is valid (optional field)
  }

  // Check for spaces
  if (value.includes(" ")) {
    return "Username cannot contain spaces";
  }

  // For website, just check if it's a valid URL format
  if (platform === "website") {
    const urlPattern =
      /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    if (!urlPattern.test(value)) {
      return "Please enter a valid website URL";
    }
  } else {
    // Check if it looks like a URL (contains a domain)
    const urlPattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
    const urlMatch = value.match(urlPattern);

    if (urlMatch) {
      // It's a URL, validate it's from the correct domain
      const domain = urlMatch[3].toLowerCase();

      const validDomains: Record<string, string[]> = {
        linkedin: ["linkedin.com"],
        instagram: ["instagram.com"],
        facebook: ["facebook.com", "fb.com"],
      };

      const allowedDomains = validDomains[platform];
      const isValidDomain = allowedDomains.some(
        (allowedDomain) => domain === allowedDomain || domain.endsWith("." + allowedDomain),
      );

      if (!isValidDomain) {
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
        return `Please enter a valid ${platformName} URL or username`;
      }
    } else {
      // It's a username, validate format (alphanumeric, dots, underscores, hyphens)
      const usernamePattern = /^[a-zA-Z0-9._-]+$/;
      if (!usernamePattern.test(value)) {
        return "This doesn't look like a username. It can only contain letters, numbers, dots, underscores, and hyphens";
      }
    }
  }

  return null;
}

const platformConfig: Record<
  SocialPlatform,
  { icon: React.ReactNode; color: string; placeholder: string }
> = {
  linkedin: {
    icon: <IconBrandLinkedin size={18} />,
    color: "blue",
    placeholder: "LinkedIn username or URL",
  },
  instagram: {
    icon: <IconBrandInstagram size={18} />,
    color: "pink",
    placeholder: "Instagram username or URL",
  },
  facebook: {
    icon: <IconBrandFacebook size={18} />,
    color: "blue",
    placeholder: "Facebook username or URL",
  },
  website: {
    icon: <IconWorld size={18} />,
    color: "gray",
    placeholder: "Website URL",
  },
};

export function SocialMediaInput({
  platform,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  loading = false,
  autoExtractUsername = true,
  error,
  displayLabel = false,
}: SocialMediaInputProps) {
  const config = platformConfig[platform];

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  const handleBlur = () => {
    // Extract username from URL if applicable and enabled
    if (autoExtractUsername && platform !== "website" && value) {
      const extractedUsername = extractUsername(platform, value);
      if (extractedUsername !== value) {
        onChange(extractedUsername);
      }
    }
    onBlur?.();
  };

  // Create href for the action icon
  const href =
    value && platform !== "website" ? createSocialMediaUrl(platform, value) : value || undefined;

  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

  return (
    <div>
      {displayLabel && (
        <label
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            marginBottom: "0.25rem",
            display: "block",
          }}
        >
          {platformName}
        </label>
      )}
      <Group gap="sm" align="center" wrap="nowrap">
        <ActionIcon
          variant="light"
          color={config.color}
          component={href ? "a" : "div"}
          href={href}
          target={href ? "_blank" : undefined}
          disabled={!href}
        >
          {config.icon}
        </ActionIcon>
        <TextInput
          placeholder={placeholder || config.placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          style={{ flex: 1 }}
          rightSection={loading ? <Loader size="xs" /> : null}
          disabled={disabled}
          error={error}
        />
      </Group>
    </div>
  );
}
