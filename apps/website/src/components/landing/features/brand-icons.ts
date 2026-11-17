/*
 * Brand marks for the contact sources in the "All the people you met in one place" tile, fetched
 * from Dashboard Icons (https://github.com/homarr-labs/dashboard-icons) and committed to
 * `public/images/brands/`. Each mark belongs to its owner and is shown only to name a real
 * source. Scan new files for scripts and external references before adding.
 *
 * Render marks on a neutral tile, not bare on the page.
 *
 * The AI clients (Claude, ChatGPT, MCP, Hermes, OpenClaw) use the same files in `AiClientLinks.tsx`:
 * `claude-ai`, `openai`, `mcp` (Simple Icons) and `hermes` as single-colour masks, `openclaw` full colour.
 * Each sits on a brand-coloured tile (`BrandTileLink.tsx`).
 */
export const BRAND_ICONS = {
  instagram: { label: "Instagram", src: "/images/brands/instagram.svg" },
  linkedin: { label: "LinkedIn", src: "/images/brands/linkedin.svg" },
  whatsapp: { label: "WhatsApp", src: "/images/brands/whatsapp.svg" },
} as const;

export type BrandIconId = keyof typeof BRAND_ICONS;
