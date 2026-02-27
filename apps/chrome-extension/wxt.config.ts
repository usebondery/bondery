import { defineConfig } from "wxt";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const getOrigin = (url: string) => {
  try {
    return `${new URL(url).origin}/*`;
  } catch {
    return url;
  }
};

export default defineConfig({
  srcDir: "src",
  alias: {
    "@bondery/helpers": resolve(__dirname, "../../packages/helpers/src/index.ts"),
    "@bondery/branding": resolve(__dirname, "../../packages/branding/src/index.ts"),
    "@bondery/mantine-next": resolve(__dirname, "../../packages/mantine-next/src/index.ts"),
  },
  vite: () => ({
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  }),
  manifest: () => {
    const appUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000";
    return {
      name: "Bondery Social Integration",
      description: "Import contacts from social media directly to Bondery",
      permissions: ["storage"],
      host_permissions: [
        "https://www.instagram.com/*",
        "https://www.linkedin.com/*",
        "https://www.facebook.com/*",
        getOrigin(appUrl),
      ],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
    };
  },
});
