export type MainAuthedState = "logged-in" | "preview" | "import";

export type PopupState =
  | "loading"
  | "logged-out"
  | "update-required"
  | MainAuthedState
  | "settings";

export interface UserInfo {
  avatarUrl?: string | null;
  email: string;
  id: string;
  name?: string | null;
}
