export function loadE2eAuthEnv(): void;

export function trustPortlessCa(): void;

export function sharedSite(a: string, b: string): string | null;

export function resolveE2ePublicUrls(): {
  apiUrl: string;
  cookieDomain: string;
  webappUrl: string;
};
