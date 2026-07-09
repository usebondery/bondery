import { BonderyIconWhite } from "@bondery/branding";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { Button, Text } from "@mantine/core";
import type React from "react";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { config } from "../../../config";
import { extLog } from "../../../lib/log";
import type { AddPersonResult } from "../../../lib/messaging/types";
import { profileCache, scrapeLinkedInProfile } from "../scrape/scrapeProfile";
import { getTopcard } from "../scrape/sduiProfile";

export { profileCache };

interface LinkedInButtonProps {
  username: string;
}

/**
 * Extracts the profile photo URL from the SDUI topcard.
 */
export function extractProfilePhotoUrl(): string | null {
  const topcard = getTopcard();
  if (!topcard) {
    return null;
  }

  const displayPhoto = topcard.querySelector<HTMLImageElement>('img[src*="profile-displayphoto"]');
  if (displayPhoto?.src && !displayPhoto.src.includes("data:image")) {
    return displayPhoto.src;
  }

  for (const img of topcard.querySelectorAll<HTMLImageElement>("img")) {
    if (
      img.src &&
      !img.src.includes("data:image") &&
      /profile|displayphoto|shrink/i.test(img.src)
    ) {
      return img.src;
    }
  }

  return null;
}

const LinkedInButton: React.FC<LinkedInButtonProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(!profileCache.has(username));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profileCache.has(username)) {
      setIsPreloading(false);
      return;
    }
    setIsPreloading(true);
    scrapeLinkedInProfile(username).finally(() => setIsPreloading(false));
  }, [username]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const profile = await scrapeLinkedInProfile(username);

      extLog.debug("[linkedin][button] Sending ADD_PERSON_REQUEST:", profile);

      const result: AddPersonResult = await browser.runtime.sendMessage({
        payload: {
          educationHistory: profile.educationHistory,
          firstName: profile.firstName,
          handle: username,
          headline: profile.headline,
          lastName: profile.lastName,
          linkedinBio: profile.linkedinBio,
          location: profile.location,
          middleName: profile.middleName,
          platform: "linkedin" as const,
          profileImageUrl: profile.profilePhotoUrl,
          workHistory: profile.workHistory,
        },
        type: "ADD_PERSON_REQUEST",
      });

      if (result.payload.success) {
        if (result.payload.existed) {
          window.open(
            `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${result.payload.contactId}`,
            "_blank",
          );
        }
        return;
      }

      if (result.payload.requiresAuth) {
        setStatusMessage("Sign in required — click the Bondery icon");
      } else {
        setStatusMessage(result.payload.error ?? "Something went wrong");
      }
    } catch (error) {
      extLog.error("Error opening in Bondery:", error);
      setStatusMessage("Extension error — try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div style={{ borderRadius: "var(--mantine-radius-xl)", overflow: "clip" }}>
        <Button
          leftSection={<BonderyIconWhite height={14} width={14} />}
          loading={isLoading || isPreloading}
          onClick={handleClick}
          radius="xl"
        >
          Open in Bondery
        </Button>
      </div>
      {statusMessage && (
        <Text c="dimmed" mt={4} size="xs" ta="center">
          {statusMessage}
        </Text>
      )}
    </>
  );
};

export default LinkedInButton;
