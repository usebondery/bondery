import React, { useState, useEffect } from "react";
import { browser } from "wxt/browser";
import { Button, Text } from "@mantine/core";
import { BonderyIconWhite } from "@bondery/branding";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { cleanPersonName } from "@bondery/helpers/name-utils";
import { config } from "../config";
const sanitizeName = cleanPersonName;
import type { AddPersonResult } from "../utils/messages";

interface LinkedInButtonProps {
  username: string;
}

const LinkedInButton: React.FC<LinkedInButtonProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("LinkedIn Button mounted for username:", username);

    // Log all extracted information immediately on mount
    const profileName = extractProfileName();
    const profilePhotoUrl = extractProfilePhotoUrl();
    const headline = extractHeadline();
    const place = extractPlace();

    console.log("LinkedIn Profile Extraction Results:", {
      username,
      profileName,
      headline,
      place,
      profilePhotoUrl,
    });
  }, [username]);

  const extractProfileName = (): {
    firstName: string;
    middleName?: string;
    lastName?: string;
  } | null => {
    const topCard = document.querySelector("section[data-member-id]") || document;
    const nameElement = topCard.querySelector("a[aria-label] > h1") || topCard.querySelector("h1");

    console.log("LinkedIn: Name element found:", !!nameElement, nameElement?.textContent);

    if (!nameElement || !nameElement.textContent) {
      // Try alternative selectors
      const alternatives = [
        "h1.text-heading-xlarge",
        ".pv-text-details__left-panel h1",
        "[data-anonymize='person-name']",
      ];

      for (const selector of alternatives) {
        const altElement = document.querySelector(selector);
        if (altElement?.textContent) {
          console.log(
            `LinkedIn: Found name using alternative selector: ${selector}`,
            altElement.textContent,
          );
          const fullName = sanitizeName(altElement.textContent.trim());
          if (fullName) {
            const nameParts = fullName.split(/\s+/);
            if (nameParts.length === 1) return { firstName: nameParts[0] };
            if (nameParts.length === 2) return { firstName: nameParts[0], lastName: nameParts[1] };
            return {
              firstName: nameParts[0],
              lastName: nameParts[nameParts.length - 1],
              middleName: nameParts.slice(1, -1).join(" "),
            };
          }
        }
      }
      return null;
    }

    const fullName = sanitizeName(nameElement.textContent.trim());

    if (!fullName) {
      // Fallback to username if name is empty after sanitization
      return { firstName: username };
    }

    const nameParts = fullName.split(/\s+/);

    if (nameParts.length === 0) return null;

    if (nameParts.length === 1) {
      return { firstName: nameParts[0] };
    }

    if (nameParts.length === 2) {
      return { firstName: nameParts[0], lastName: nameParts[1] };
    }

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const middleName = nameParts.slice(1, -1).join(" ");

    return { firstName, lastName, middleName };
  };

  const extractHeadline = (): string | null => {
    const topCard = document.querySelector("section[data-member-id]") || document;
    const titleElement = topCard.querySelector("div[data-generated-suggestion-target]");

    console.log("LinkedIn: Title element found:", !!titleElement, titleElement?.textContent);

    if (titleElement && titleElement.textContent) {
      return titleElement.textContent.trim();
    }

    // Try alternative selectors
    const alternatives = [
      ".text-body-medium.break-words",
      ".pv-text-details__left-panel .text-body-medium",
      "[data-anonymize='headline']",
    ];

    for (const selector of alternatives) {
      const altElement = document.querySelector(selector);
      if (altElement?.textContent) {
        console.log(
          `LinkedIn: Found headline using alternative selector: ${selector}`,
          altElement.textContent,
        );
        return altElement.textContent.trim();
      }
    }

    return null;
  };

  const extractPlace = (): string | null => {
    const topCard = document.querySelector("section[data-member-id]") || document;
    const contactInfoLink = topCard.querySelector("#top-card-text-details-contact-info");
    const placeElement = contactInfoLink?.parentElement?.previousElementSibling || null;

    console.log("LinkedIn: Place element found:", !!placeElement, placeElement?.textContent);

    if (placeElement && placeElement.textContent) {
      return placeElement.textContent.trim();
    }

    // Try alternative selectors
    const alternatives = [
      ".pv-text-details__left-panel .text-body-small.inline",
      "[data-anonymize='location']",
      ".pb2.pv-text-details__left-panel span.text-body-small",
    ];

    for (const selector of alternatives) {
      const altElement = document.querySelector(selector);
      if (altElement?.textContent) {
        console.log(
          `LinkedIn: Found place using alternative selector: ${selector}`,
          altElement.textContent,
        );
        return altElement.textContent.trim();
      }
    }

    return null;
  };

  const extractProfilePhotoUrl = (): string | null => {
    const topCard = document.querySelector("section[data-member-id]") || document;
    const profilePhotoImg = topCard.querySelector(
      "button[aria-label*='profile picture'] img",
    ) as HTMLImageElement | null;

    if (profilePhotoImg?.src && !profilePhotoImg.src.includes("data:image")) {
      console.log(
        "LinkedIn: Profile photo element found (profile-picture button):",
        true,
        profilePhotoImg.src,
      );
      return profilePhotoImg.src;
    }
    // Find image inside element with data-view-name="profile-top-card-member-photo"
    const memberPhotoContainer = document.querySelector(
      '[data-view-name="profile-top-card-member-photo"]',
    );

    if (memberPhotoContainer) {
      const img = memberPhotoContainer.querySelector('img[data-loaded="true"]') as HTMLImageElement;
      console.log("LinkedIn: Profile photo element found (member-photo):", !!img, img?.src);

      if (img?.src && !img.src.includes("data:image")) {
        return img.src;
      }
    }

    // Fallback to original selector
    const img = document.querySelector(
      "img._021a4e24.a4f8c248.ad272af2._8d269092._00859a34",
    ) as HTMLImageElement;

    console.log("LinkedIn: Profile photo element found (fallback):", !!img, img?.src);

    if (img && img.src && !img.src.includes("data:image")) {
      return img.src;
    }

    // Try alternative selectors
    const alternatives = [
      ".pv-top-card-profile-picture__image",
      "[data-anonymize='headshot-photo']",
      "img.profile-photo-edit__preview",
    ];

    for (const selector of alternatives) {
      const altImg = document.querySelector(selector) as HTMLImageElement;
      if (altImg?.src && !altImg.src.includes("data:image")) {
        console.log(`LinkedIn: Found photo using alternative selector: ${selector}`, altImg.src);
        return altImg.src;
      }
    }

    return null;
  };

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const profileName = extractProfileName();
      const profilePhotoUrl = extractProfilePhotoUrl();
      const headline = extractHeadline();
      const place = extractPlace();

      console.log("LinkedIn Profile Data:", {
        username,
        name: profileName,
        headline,
        place,
        profilePicture: profilePhotoUrl,
      });

      const result: AddPersonResult = await browser.runtime.sendMessage({
        type: "ADD_PERSON_REQUEST",
        payload: {
          platform: "linkedin" as const,
          handle: username,
          firstName: profileName?.firstName,
          middleName: profileName?.middleName,
          lastName: profileName?.lastName,
          profileImageUrl: profilePhotoUrl ?? undefined,
          headline: headline ?? undefined,
          place: place ?? undefined,
        },
      });

      if (result.payload.success) {
        window.open(
          `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${result.payload.contactId}`,
          "_blank",
        );
        return;
      } else {
        if (result.payload.requiresAuth) {
          setStatusMessage("Sign in required — click the Bondery icon");
        } else {
          setStatusMessage(result.payload.error ?? "Something went wrong");
        }
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
      <Button
        onClick={handleClick}
        loading={isLoading}
        fullWidth
        radius="xl"
        size="xl"
        leftSection={<BonderyIconWhite width={16} height={16} />}
      >
        Open in Bondery
      </Button>
      {statusMessage && (
        <Text size="xs" c="dimmed" ta="center" mt={4}>
          {statusMessage}
        </Text>
      )}
    </>
  );
};

export default LinkedInButton;
