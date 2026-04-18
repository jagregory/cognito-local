import { describe, expect, it } from "vitest";
import { generate, generateSecret, verify } from "./totp";

describe("totp", () => {
  it("generates a base32 secret", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it("verifies a freshly generated token", () => {
    const secret = generateSecret();
    const token = generate(secret);
    expect(verify(secret, token)).toBe(true);
  });

  it("rejects an incorrect token", () => {
    const secret = generateSecret();
    expect(verify(secret, "000000")).toBe(false);
  });
});
