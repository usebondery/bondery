import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config — reads BONDERY_PUBLIC_* from process.env into `extra`
 * so app code never depends on EXPO_PUBLIC_ inlining.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.BONDERY_PUBLIC_API_URL ?? "";
  const supabaseUrl = process.env.BONDERY_PUBLIC_SUPABASE_URL ?? "";
  const supabasePublishableKey = process.env.BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const websiteUrl = process.env.BONDERY_PUBLIC_WEBSITE_URL ?? "https://usebondery.com";
  const syncDebug = process.env.BONDERY_PUBLIC_SYNC_DEBUG ?? "";

  return {
    ...config,
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/images/icon_512.png",
      },
      package: "com.bondery.mobile",
      permissions: ["android.permission.CAMERA", "android.permission.READ_MEDIA_IMAGES"],
    },
    assetBundlePatterns: ["**/*"],
    buildCacheProvider: "eas",
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiUrl,
      eas: {
        projectId: "d07d8729-e178-4d86-ba54-0a6a3be84f85",
      },
      router: {},
      supabasePublishableKey,
      supabaseUrl,
      syncDebug,
      websiteUrl,
    },
    icon: "./assets/images/icon_1024.png",
    ios: {
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
      "expo-splash-screen",
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
      "react-native-enriched-markdown",
    ],
    scheme: "bondery",
    slug: "bondery",
    userInterfaceStyle: "automatic",
    version: "1.6.0",
  };
};
