export const SOCIAL_PLATFORM_URL_DETAILS = {
  instagram: {
    domain: "instagram.com",
    wwwDomain: "www.instagram.com",
    profileBaseUrl: "https://instagram.com/",
    profileBaseUrlWithWww: "https://www.instagram.com/",
    hostMatchPattern: "https://www.instagram.com/*",
  },
  linkedin: {
    domain: "linkedin.com",
    wwwDomain: "www.linkedin.com",
    profileBaseUrl: "https://linkedin.com/in/",
    profileBaseUrlWithWww: "https://www.linkedin.com/in/",
    hostMatchPattern: "https://www.linkedin.com/*",
  },
  facebook: {
    domain: "facebook.com",
    wwwDomain: "www.facebook.com",
    profileBaseUrl: "https://facebook.com/",
    profileBaseUrlWithWww: "https://www.facebook.com/",
    hostMatchPattern: "https://www.facebook.com/*",
    messengerBaseUrl: "https://m.me/",
  },
  whatsapp: {
    domain: "wa.me",
    deepLinkBaseUrl: "https://wa.me/",
  },
} as const;
