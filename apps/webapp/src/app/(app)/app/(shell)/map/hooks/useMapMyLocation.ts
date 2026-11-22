"use client";

import { detachPromise } from "@bondery/helpers/async";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import { notifications } from "@mantine/notifications";
import type { PeopleMapFocus, PeopleMapMyLocationControl } from "@/components/map/PeopleMap";
import {
  type MapGeolocationFailureStatus,
  type MapSelfLocation,
  useMapGeolocation,
} from "@/components/map/useMapGeolocation";
import { useCommonTranslations, useMapPageTranslations } from "@/lib/i18n/generated/hooks";

interface UseMapMyLocationOptions {
  /** Location resolved by the silent granted-permission probe, used until the user asks. */
  grantedSelfLocation: MapSelfLocation | null;
  onFocus: (focus: PeopleMapFocus) => void;
}

/** "My location" control state, geolocation request handling and the resulting self location. */
export function useMapMyLocation({ grantedSelfLocation, onFocus }: UseMapMyLocationOptions) {
  const t = useMapPageTranslations();
  const tCommon = useCommonTranslations();
  const {
    isDisabled: isMyLocationDisabled,
    isPrompting: isMyLocationPrompting,
    requestLocation,
    selfLocation: requestedSelfLocation,
    status: geolocationStatus,
  } = useMapGeolocation();

  const selfLocation = requestedSelfLocation ?? grantedSelfLocation;

  const geolocationFailureMessage = (status: MapGeolocationFailureStatus): string => {
    switch (status) {
      case "denied":
        return t("MyLocationDenied");
      case "unavailable":
        return t("MyLocationUnavailable");
      case "timeout":
        return t("MyLocationTimeout");
      case "insecure":
        return t("MyLocationInsecure");
      case "unsupported":
        return t("MyLocationUnsupported");
    }
  };

  const handleMyLocation = () => {
    detachPromise(
      requestLocation().then((result) => {
        if (result.ok) {
          onFocus({
            latitude: result.location.latitude,
            longitude: result.location.longitude,
            token: `self-${Date.now()}`,
            zoom: 14,
          });
          return;
        }

        notifications.show(
          errorNotificationTemplate({
            description: geolocationFailureMessage(result.status),
            title: tCommon("feedback.errorTitle"),
          }),
        );
      }),
    );
  };

  let myLocationDisabledTooltip: string | undefined;
  if (geolocationStatus === "insecure") {
    myLocationDisabledTooltip = t("MyLocationInsecure");
  } else if (geolocationStatus === "unsupported") {
    myLocationDisabledTooltip = t("MyLocationUnsupported");
  }

  const myLocationControl: PeopleMapMyLocationControl = {
    ariaLabel: isMyLocationPrompting ? t("MyLocationLocating") : t("MyLocation"),
    disabled: isMyLocationDisabled,
    disabledTooltip: myLocationDisabledTooltip,
    loading: isMyLocationPrompting,
    onClick: handleMyLocation,
  };

  return { myLocationControl, selfLocation };
}
