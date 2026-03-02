import React, { useRef, useState } from "react";
import { browser } from "wxt/browser";
import { Button, Text } from "@mantine/core";
import { BonderyIconWhite } from "@bondery/branding";
import { parseInstagramUsername } from "@bondery/helpers";
import type { AddPersonResult } from "../utils/messages";

interface InstagramButtonProps {
  username: string;
  getSnapshot?: () => InstagramProfileSnapshot | null;
}

interface InstagramProfileSnapshot {
  platform: "instagram";
  handle: string;
  displayName: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  profileImageUrl?: string;
  headline?: string;
  place?: string;
  notes?: string;
}

const InstagramButton: React.FC<InstagramButtonProps> = ({ username, getSnapshot }) => {
  const [isLoading, setIsLoading] = useState(false);
  const requestInFlightRef = useRef(false);

  const extractProfileName = (): {
    firstName: string;
    middleName?: string;
    lastName?: string;
  } | null => {
    const nameElement = document.querySelector(
      ".x1lliihq.x1plvlek.xryxfnj.x1n2onr6.xyejjpt.x15dsfln.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.xpm28yp.x8viiok.x1o7cslx",
    );

    const parsed = parseInstagramUsername({
      displayName: nameElement?.textContent?.trim(),
      username,
    });

    return {
      firstName: parsed.firstName,
      ...(parsed.middleName ? { middleName: parsed.middleName } : {}),
      ...(parsed.lastName ? { lastName: parsed.lastName } : {}),
    };
  };

  const extractProfilePhotoUrl = (): string | null => {
    const img = document.querySelector(
      `img[alt="${username}'s profile picture"]`,
    ) as HTMLImageElement;
    if (img && img.src) {
      return img.src;
    }
    return null;
  };

  const extractBioText = (): string | undefined => {
    const selectors = [
      "header section div[dir='auto'] span",
      "header div[dir='auto'] span",
      "section main header div[dir='auto'] span",
    ];

    for (const selector of selectors) {
      const value = document.querySelector(selector)?.textContent?.trim();
      if (value) {
        return value;
      }
    }

    return undefined;
  };

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const snapshot = getSnapshot?.();
      const profileName = snapshot
        ? {
            firstName: snapshot.firstName,
            middleName: snapshot.middleName,
            lastName: snapshot.lastName,
          }
        : extractProfileName();
      const profilePhotoUrl = snapshot?.profileImageUrl ?? extractProfilePhotoUrl();
      const notes = snapshot?.notes ?? extractBioText();

      console.log("Instagram Profile Data:", {
        username,
        name: profileName,
        profilePicture: profilePhotoUrl,
        notes,
      });

      const result: AddPersonResult = await browser.runtime.sendMessage({
        type: "ADD_PERSON_REQUEST",
        payload: {
          platform: "instagram" as const,
          handle: username,
          firstName: profileName?.firstName,
          middleName: profileName?.middleName,
          lastName: profileName?.lastName,
          profileImageUrl: profilePhotoUrl ?? undefined,
          headline: snapshot?.headline,
          place: snapshot?.place,
          notes,
        },
      });

      if (result.payload.success) {
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
      requestInFlightRef.current = false;
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        loading={isLoading}
        fullWidth
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

export default InstagramButton;
