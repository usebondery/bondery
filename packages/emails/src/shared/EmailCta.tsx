import type { JSX } from "react";
import { Link, Section } from "react-email";
import { ctaButtonStyle } from "#shared/email-styles.js";

export function EmailCta({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <Section style={{ margin: "24px 0 8px", textAlign: "center" }}>
      <Link href={href} style={ctaButtonStyle}>
        {label}
      </Link>
    </Section>
  );
}
