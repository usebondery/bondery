import type React from "react";
import { useState, useEffect } from "react";
import { browser } from "wxt/browser";
import { Button, Text } from "@mantine/core";
import { BonderyIconWhite } from "@bondery/branding";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { config } from "../config";
import { getTopcard } from "./sduiProfile";
import { profileCache, scrapeLinkedInProfile } from "./scrapeProfile";
import type { AddPersonResult } from "../utils/messages";

export { profileCache };

interface LinkedInButtonProps {
  username: string;
}

/**
 * Extracts the profile photo URL from the SDUI topcard.
 */
export function extractProfilePhotoUrl(): string | null {
  const topcard = getTopcard();
  if (!topcard) return null;

  const displayPhoto = topcard.querySelector<HTMLImageElement>('img[src*="profile-displayphoto"]');
  if (displayPhoto?.src && !displayPhoto.src.includes("data:image")) {
    return displayPhoto.src;
  }

  for (const img of topcard.querySelectorAll<HTMLImageElement>("img")) {
    if (img.src && !img.src.includes("data:image") && /profile|displayphoto|shrink/i.test(img.src)) {
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

      console.log("[linkedin][button] Sending ADD_PERSON_REQUEST:", profile);

      const result: AddPersonResult = await browser.runtime.sendMessage({
        type: "ADD_PERSON_REQUEST",
        payload: {
          platform: "linkedin" as const,
          handle: username,
          firstName: profile.firstName,
          middleName: profile.middleName,
          lastName: profile.lastName,
          profileImageUrl: profile.profilePhotoUrl,
          headline: profile.headline,
          location: profile.location,
          workHistory: profile.workHistory,
          educationHistory: profile.educationHistory,
          linkedinBio: profile.linkedinBio,
        },
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
      console.error("Error opening in Bondery:", error);
      setStatusMessage("Extension error — try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div style={{ overflow: "clip", borderRadius: "var(--mantine-radius-xl)" }}>
        <Button
          onClick={handleClick}
          loading={isLoading || isPreloading}
          radius="xl"
          size="lg"
          leftSection={<BonderyIconWhite width={14} height={14} />}
        >
          Open in Bondery
        </Button>
      </div>
      {statusMessage && (
        <Text size="xs" c="dimmed" ta="center" mt={4}>
          {statusMessage}
        </Text>
      )}
    </>
  );
};

export default LinkedInButton;
