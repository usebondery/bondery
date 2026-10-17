import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config — reads BONDERY_PUBLIC_* from process.env into `extra`
 * so app code never depends on EXPO_PUBLIC_ inlining.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.BONDERY_PUBLIC_API_URL ?? "";
  const storageUrl = process.env.BONDERY_PUBLIC_STORAGE_URL ?? "";
  const websiteUrl = process.env.BONDERY_PUBLIC_WEBSITE_URL ?? "https://usebondery.com";
  const syncDebug = process.env.BONDERY_PUBLIC_SYNC_DEBUG ?? "";
  const associatedHost = associatedDomainHost(websiteUrl);

  return {
    ...config,
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/images/icon_512.png",
      },
      // Keep in sync with MOBILE_APP_PACKAGE_ID in packages/helpers/src/auth/associated-domains.ts
      package: "com.usebondery.mobile",
      permissions: ["android.permission.CAMERA", "android.permission.READ_MEDIA_IMAGES"],
      ...(associatedHost
        ? {
            intentFilters: [
              {
                action: "VIEW",
                autoVerify: true,
                category: ["BROWSABLE", "DEFAULT"],
                data: [{ host: associatedHost, scheme: "https" }],
              },
            ],
          }
        : {}),
    },
    assetBundlePatterns: ["**/*"],
    // Object form uses require() so local `expo run:android` works on Windows.
    // The string `"eas"` dynamically imports the plugin as `c:\...`, which Node rejects.
    buildCacheProvider: {
      plugin: "eas-build-cache-provider",
    },
    experiments: {
      reactCompiler: true,
      typedRoutes: true,
    },
    extra: {
      apiUrl,
      eas: {
        projectId: "d07d8729-e178-4d86-ba54-0a6a3be84f85",
      },
      router: {},
      storageUrl,
      syncDebug,
      websiteUrl,
    },
    icon: "./assets/images/icon_1024.png",
    ios: {
      associatedDomains: associatedHost
        ? [`applinks:${associatedHost}`, `webcredentials:${associatedHost}`]
        : undefined,
      bundleIdentifier: "com.usebondery.mobile",
      icon: "./assets/images/icon_1024.png",
      infoPlist: {
        NSCameraUsageDescription: "Bondery needs camera access to set contact profile photos.",
        NSPhotoLibraryUsageDescription:
          "Bondery needs photo library access to set contact profile photos.",
      },
      supportsTablet: true,
    },
    name: "Bondery",
    orientation: "portrait",
    owner: "bondery",
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-web-browser",
      "expo-sharing",
      "expo-image",
      "expo-sqlite",
      [
        "expo-splash-screen",
        {
          android: {
            backgroundColor: "#a34bcb",
            image: "./assets/images/splash-icon.png",
            imageWidth: 200,
            resizeMode: "contain",
          },
          backgroundColor: "#a34bcb",
          dark: {
            backgroundColor: "#a34bcb",
            image: "./assets/images/splash-icon.png",
          },
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          ios: {
            backgroundColor: "#a34bcb",
            image: "./assets/images/splash-icon.png",
            imageWidth: 200,
            resizeMode: "contain",
          },
          resizeMode: "contain",
        },
      ],
      [
        "expo-image-picker",
        {
          cameraPermission: "Bondery needs camera access to set contact profile photos.",
          photosPermission: "Bondery needs photo library access to set contact profile photos.",
        },
      ],
      [
        "expo-navigation-bar",
        {
          enforceContrast: false,
        },
      ],
    ],
    scheme: "bondery",
    slug: "bondery",
    userInterfaceStyle: "automatic",
    version: "1.11.0",
  };
};

/**
 * Associated-domain host for passkeys and App Links. Skip localhost and IP
 * so local Expo configs do not claim production well-known files.
 */
function associatedDomainHost(websiteUrl: string): string | null {
  try {
    const parsed = new URL(websiteUrl);
    if (parsed.protocol !== "https:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname === "localhost" || hostname.includes(":")) {
      return null;
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}
