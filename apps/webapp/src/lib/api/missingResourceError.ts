import { ApiError } from "@bondery/helpers/api";

export type MissingResourceCode =
  | "contact_not_found"
  | "group_not_found"
  | "interaction_not_found"
  | "tag_not_found";

export function missingResourceError(code: MissingResourceCode): ApiError {
  return new ApiError({
    code,
    developerMessage: code,
    status: 404,
    type: "not_found_error",
  });
}
