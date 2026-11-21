import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import type { CSSProperties } from "react";

export const EMAIL_PAGE_BG = "#ffffff";
export const EMAIL_TEXT = "#111827";
export const EMAIL_MUTED = "#4b5563";
/** Inbox-safe content width. Matches the React Email `Container` default. */
export const EMAIL_CONTAINER_MAX_WIDTH = 600;

export const headingStyle: CSSProperties = {
  color: EMAIL_TEXT,
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: "32px",
  margin: "0 0 12px",
};

export const descriptionStyle: CSSProperties = {
  color: EMAIL_TEXT,
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

export const notesStyle: CSSProperties = {
  color: EMAIL_MUTED,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 0 0",
};

export const footerTextStyle: CSSProperties = {
  color: EMAIL_MUTED,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 8px",
};

export const chromeLinkStyle: CSSProperties = {
  color: BRAND_PRIMARY_COLOR,
  textDecoration: "underline",
};

export const ctaButtonStyle: CSSProperties = {
  backgroundColor: BRAND_PRIMARY_COLOR,
  borderRadius: "8px",
  boxSizing: "border-box",
  color: "#ffffff",
  display: "block",
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: "44px",
  minHeight: "44px",
  padding: "0 24px",
  textAlign: "center",
  textDecoration: "none",
  width: "100%",
};
