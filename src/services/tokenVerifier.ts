import jwt from "jsonwebtoken";
import PublicKey from "../keys/cognitoLocal.public.json";
import type { Token } from "./tokenGenerator";

/**
 * Verify or decode an access token depending on the enforcement flag.
 *
 * When `enforce` is true, the JWT signature and expiration are validated.
 * When false (default), the token is decoded without verification — matching
 * the legacy cognito-local behavior.
 */
export function verifyToken(accessToken: string, enforce: boolean): Token {
  if (enforce) {
    return jwt.verify(accessToken, PublicKey.pem, {
      algorithms: ["RS256"],
    }) as Token;
  }

  const decoded = jwt.decode(accessToken) as Token | null;
  if (!decoded) {
    throw new jwt.JsonWebTokenError("Unable to decode token");
  }
  return decoded;
}

/**
 * Verify a refresh token JWT. Returns true if valid, false if expired or
 * has an invalid signature.
 */
export function verifyRefreshToken(refreshToken: string): boolean {
  try {
    jwt.verify(refreshToken, PublicKey.pem, { algorithms: ["RS256"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an access token's origin_jti has been revoked.
 * Returns true if the token has been revoked.
 */
export function isTokenRevoked(
  token: Token,
  revokedJtis: readonly string[],
): boolean {
  if (!token.origin_jti || revokedJtis.length === 0) {
    return false;
  }
  return revokedJtis.includes(token.origin_jti);
}
