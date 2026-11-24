/** Scheme prefix of an `Authorization: Bearer <token>` header, including the trailing space. */
export const BEARER_PREFIX = "Bearer ";

/** A compact JWS (JWT) has a header, a payload and a signature, joined by dots. */
export const JWT_SEGMENT_COUNT = 3;

/** True when the token has the dot-separated shape of a JWT rather than an opaque token. */
export function isJwtShapedToken(token: string): boolean {
  return token.split(".").length === JWT_SEGMENT_COUNT;
}
