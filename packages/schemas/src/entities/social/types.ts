export type SocialPlatform =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "website"
  | "whatsapp"
  | "signal";

export interface SocialHandleInput {
  platform: SocialPlatform;
  value: string;
}
