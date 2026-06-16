import { createHash } from "node:crypto";

export function verifyS256(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  const digest = createHash("sha256").update(codeVerifier).digest("base64url");
  return digest === codeChallenge;
}
