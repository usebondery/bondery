import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-email";

const PATTERN_5E5C7B5C7B28_RE = /^\{\{(?<group1>\w+)\}\}$/u;

const PLACEHOLDER = /(?<group1>\{\{\w+\}\})/gu;

export function interpolateNamedLinks(
  template: string,
  links: Record<string, { href: string; label: string }>,
  linkStyle: CSSProperties,
): ReactNode[] {
  return template.split(PLACEHOLDER).map((part) => {
    const match = part.match(PATTERN_5E5C7B5C7B28_RE);
    if (!match) {
      return part;
    }

    const [, token] = match;
    const link = token ? links[token] : undefined;
    if (!link) {
      return part;
    }

    return (
      <Link href={link.href} key={token} style={linkStyle}>
        {link.label}
      </Link>
    );
  });
}
