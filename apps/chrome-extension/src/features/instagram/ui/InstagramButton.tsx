import { BonderyIconWhite } from "@bondery/branding";
import { parseInstagramUsername } from "@bondery/helpers";
import { Button, Text } from "@mantine/core";
import type React from "react";
import { useRef, useState } from "react";
import { browser } from "wxt/browser";
import { extLog } from "../../../lib/log";
import type { AddPersonResult } from "../../../lib/messaging/types";

interface InstagramButtonProps {
  getSnapshot?: () => InstagramProfileSnapshot | null;
  username: string;
}

interface InstagramProfileSnapshot {
  displayName: string;
  firstName: string;
  handle: string;
  headline?: string;
  lastName?: string;
  location?: string;
  middleName?: string;
  notes?: string;
  platform: "instagram";
  profileImageUrl?: string;
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
    if (img?.src) {
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
            lastName: snapshot.lastName,
            middleName: snapshot.middleName,
          }
        : extractProfileName();
      const profilePhotoUrl = snapshot?.profileImageUrl ?? extractProfilePhotoUrl();
      const notes = snapshot?.notes ?? extractBioText();

      extLog.debug("Instagram Profile Data:", {
        name: profileName,
        notes,
        profilePicture: profilePhotoUrl,
        username,
      });

      const result: AddPersonResult = await browser.runtime.sendMessage({
        payload: {
          firstName: profileName?.firstName,
          handle: username,
          headline: snapshot?.headline,
          lastName: profileName?.lastName,
          location: snapshot?.location,
          middleName: profileName?.middleName,
          notes,
          platform: "instagram" as const,
          profileImageUrl: profilePhotoUrl ?? undefined,
        },
        type: "ADD_PERSON_REQUEST",
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
      extLog.error("Error opening in Bondery:", error);
      setStatusMessage("Extension error — try again");
    } finally {
      setIsLoading(false);
      requestInFlightRef.current = false;
    }
  };

  return (
    <>
      <Button
        fullWidth
        leftSection={<BonderyIconWhite height={16} width={16} />}
        loading={isLoading}
        onClick={handleClick}
      >
        Open in Bondery
      </Button>
      {statusMessage && (
        <Text c="dimmed" mt={4} size="xs" ta="center">
          {statusMessage}
        </Text>
      )}
    </>
  );
};

export default InstagramButton;
