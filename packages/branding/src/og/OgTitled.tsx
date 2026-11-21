import type { ReactElement } from "react";
import { OG_BACKGROUND, OG_FONT_FAMILY, OG_GRADIENT_TO } from "#og/constants.js";
import { Logotype } from "#og/Logotype.js";
import { truncateOgTitle } from "#og/truncate.js";

type OgTitledProps = {
  title: string;
  /** Small label above the title (e.g. "Blog", "Docs"). */
  subtype?: string;
};

/**
 * Titled OG card — optional subtype, page title, and logotype footer.
 * Used for blog posts, docs, and static marketing pages.
 */
export function OgTitled({ title, subtype }: OgTitledProps): ReactElement {
  const displayTitle = truncateOgTitle(title);

  return (
    <div
      style={{
        backgroundImage: OG_BACKGROUND,
        display: "flex",
        flexDirection: "column",
        fontFamily: OG_FONT_FAMILY,
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {subtype ? (
          <p
            style={{
              color: OG_GRADIENT_TO,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 2,
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {subtype}
          </p>
        ) : null}
        <p
          style={{
            color: "#111827",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            margin: 0,
            maxWidth: 980,
          }}
        >
          {displayTitle}
        </p>
      </div>
      <Logotype width={280} />
    </div>
  );
}
