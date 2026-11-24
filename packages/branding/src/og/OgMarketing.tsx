import type { ReactElement } from "react";
import { OG_BACKGROUND, OG_FONT_FAMILY } from "#og/constants.js";
import { Logotype } from "#og/Logotype.js";

type OgMarketingProps = {
  /** Optional tagline shown under the logotype. */
  tagline?: string;
};

/**
 * Default branded OG card — centered logotype on the shared brand wash.
 * Used for website and webapp root opengraph-image routes.
 */
export function OgMarketing({ tagline }: OgMarketingProps): ReactElement {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundImage: OG_BACKGROUND,
        display: "flex",
        flexDirection: "column",
        fontFamily: OG_FONT_FAMILY,
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <Logotype width={720} />
      {tagline ? (
        <p
          style={{
            color: "#4b5563",
            fontSize: 36,
            fontWeight: 500,
            margin: 0,
            marginTop: 40,
            textAlign: "center",
          }}
        >
          {tagline}
        </p>
      ) : null}
    </div>
  );
}
