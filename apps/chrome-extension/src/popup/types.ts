export type MainAuthedState = "logged-in" | "preview" | "import";

export type PopupState = "loading" | "logged-out" | MainAuthedState | "settings";

export interface UserInfo {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}
