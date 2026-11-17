/*
 * Brand marks for the contact sources in the "Everyone you met in one place" tile, fetched
 * from Dashboard Icons (https://github.com/homarr-labs/dashboard-icons) and committed to
 * `public/images/brands/`. Each mark belongs to its owner and is shown only to name a real
 * source. Scan new files for scripts and external references before adding.
 *
 * Render marks on a neutral tile, not bare on the page.
 *
 * The AI clients (Claude, ChatGPT, MCP, Hermes, OpenClaw) do not use logos. They are Mantine
 * light-variant buttons with Tabler icons (see `AiClientLinks.tsx`), like the webapp's
 * social buttons.
 */
export const BRAND_ICONS = {
  instagram: { label: "Instagram", src: "/images/brands/instagram.svg" },
  linkedin: { label: "LinkedIn", src: "/images/brands/linkedin.svg" },
  whatsapp: { label: "WhatsApp", src: "/images/brands/whatsapp.svg" },
} as const;

export type BrandIconId = keyof typeof BRAND_ICONS;
