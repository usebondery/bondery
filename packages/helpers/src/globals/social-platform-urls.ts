export const SOCIAL_PLATFORM_URL_DETAILS = {
  facebook: {
    domain: "facebook.com",
    hostMatchPattern: "https://www.facebook.com/*",
    messengerBaseUrl: "https://m.me/",
    profileBaseUrl: "https://facebook.com/",
    profileBaseUrlWithWww: "https://www.facebook.com/",
    wwwDomain: "www.facebook.com",
  },
  instagram: {
    domain: "instagram.com",
    hostMatchPattern: "https://www.instagram.com/*",
    profileBaseUrl: "https://instagram.com/",
    profileBaseUrlWithWww: "https://www.instagram.com/",
    wwwDomain: "www.instagram.com",
  },
  linkedin: {
    domain: "linkedin.com",
    hostMatchPattern: "https://www.linkedin.com/*",
    profileBaseUrl: "https://linkedin.com/in/",
    profileBaseUrlWithWww: "https://www.linkedin.com/in/",
    wwwDomain: "www.linkedin.com",
  },
  whatsapp: {
    deepLinkBaseUrl: "https://wa.me/",
    domain: "wa.me",
  },
} as const;
