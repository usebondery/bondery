import { BRAND_PRIMARY_COLOR, BRAND_PRIMARY_SHADES } from "@bondery/branding";
import { Avatar } from "@mantine/core";
import { forwardRef, type HTMLAttributes } from "react";
import { getAvatarColorFromName } from "@/lib/contacts/avatarColor";

const PERSON_MARKER_SIZE = 34;
const SELF_MARKER_SIZE = 34;

export const avatarRingStyle = {
  backgroundColor: "#fff",
  border: `3px solid ${BRAND_PRIMARY_COLOR}`,
  boxShadow: "0 0 0 2px #fff, 0 1px 4px rgba(0, 0, 0, 0.25)",
  opacity: 1,
} as const;

type ClusterTier = {
  diameter: number;
  /** Solid Mantine branding-primary shade (not a CSS gradient). */
  shade: (typeof BRAND_PRIMARY_SHADES)[number];
};

export function getClusterTier(count: number): ClusterTier {
  if (count >= 50) {
    return { diameter: 64, shade: BRAND_PRIMARY_SHADES[8] };
  }
  if (count >= 25) {
    return { diameter: 56, shade: BRAND_PRIMARY_SHADES[7] };
  }
  if (count >= 10) {
    return { diameter: 48, shade: BRAND_PRIMARY_SHADES[6] };
  }
  if (count >= 5) {
    return { diameter: 40, shade: BRAND_PRIMARY_SHADES[5] };
  }
  return { diameter: 32, shade: BRAND_PRIMARY_SHADES[4] };
}

export const PersonMapAvatarMarker = forwardRef<
  HTMLDivElement,
  {
    avatarUrl?: string | null;
    firstName: string;
    lastName?: string | null;
    name: string;
  } & HTMLAttributes<HTMLDivElement>
>(function PersonMapAvatarMarker({ avatarUrl, firstName, lastName, name, style, ...rest }, ref) {
  return (
    <div
      {...rest}
      aria-label={name}
      data-person-map-marker=""
      ref={ref}
      role="img"
      style={{ cursor: "inherit", opacity: 1, pointerEvents: "auto", ...style }}
    >
      <Avatar
        color={getAvatarColorFromName(firstName, lastName)}
        name={name}
        radius="xl"
        size={PERSON_MARKER_SIZE}
        src={avatarUrl || undefined}
        style={avatarRingStyle}
      />
    </div>
  );
});

export function SelfMapAvatarMarker(input: {
  ariaLabel: string;
  avatarUrl: string | null;
  displayName: string;
}) {
  return (
    <div
      aria-label={input.ariaLabel}
      data-person-map-self-marker=""
      role="img"
      style={{ opacity: 1, pointerEvents: "none" }}
      title={input.ariaLabel}
    >
      <Avatar
        name={input.displayName}
        radius="xl"
        size={SELF_MARKER_SIZE}
        src={input.avatarUrl || undefined}
        style={{ ...avatarRingStyle, pointerEvents: "none" }}
      />
    </div>
  );
}

export function ClusterMapBubble({ count }: { count: number }) {
  const { diameter, shade } = getClusterTier(count);
  const fontSize = Math.max(11, Math.round(diameter * 0.34));

  return (
    <div
      data-person-map-cluster=""
      style={{
        alignItems: "center",
        background: shade,
        border: "2.5px solid #fff",
        borderRadius: "50%",
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.28)",
        color: "#fff",
        display: "flex",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize,
        fontWeight: 600,
        height: diameter,
        justifyContent: "center",
        lineHeight: 1,
        width: diameter,
      }}
    >
      {count}
    </div>
  );
}
