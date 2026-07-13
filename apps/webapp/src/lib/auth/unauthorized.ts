export { isUnauthorizedApiError } from "@bondery/helpers/api";

export function isUnauthorizedResponseStatus(status: number): boolean {
  return status === 401;
}
