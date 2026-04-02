import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import PrivateKey from "../keys/cognitoLocal.private.json";
import type { Token } from "./tokenGenerator";
import {
  isTokenRevoked,
  verifyRefreshToken,
  verifyToken,
} from "./tokenVerifier";

const sign = (payload: object, options?: jwt.SignOptions) =>
  jwt.sign(payload, PrivateKey.pem, { algorithm: "RS256", ...options });

const WRONG_KEY =
  "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWep4PAtGoMadGSY0fMcEFCEcOJEsES\neJCUJzMIFNGin5EFO0Tq8Aedmail shortened for brevity\n-----END RSA PRIVATE KEY-----";

describe("tokenVerifier", () => {
  describe("verifyRefreshToken", () => {
    it("returns true for a valid token", () => {
      const token = sign({ sub: "user1" }, { expiresIn: "7d" });
      expect(verifyRefreshToken(token)).toBe(true);
    });

    it("returns false for an expired token", () => {
      const token = sign({
        sub: "user1",
        exp: Math.floor(Date.now() / 1000) - 10,
      });
      expect(verifyRefreshToken(token)).toBe(false);
    });

    it("returns false for a malformed token", () => {
      expect(verifyRefreshToken("not-a-jwt")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(verifyRefreshToken("")).toBe(false);
    });
  });

  describe("verifyToken", () => {
    const validPayload = {
      client_id: "client1",
      sub: "user1",
      token_use: "access",
      username: "user1",
      event_id: "evt1",
      scope: "aws.cognito.signin.user.admin",
      jti: "jti1",
    };

    describe("enforce = true", () => {
      it("returns decoded token for a valid JWT", () => {
        const token = sign(validPayload, { expiresIn: "1h" });
        const result = verifyToken(token, true);
        expect(result.sub).toBe("user1");
        expect(result.client_id).toBe("client1");
      });

      it("throws for an expired token", () => {
        const token = sign({
          ...validPayload,
          exp: Math.floor(Date.now() / 1000) - 10,
        });
        expect(() => verifyToken(token, true)).toThrow();
      });

      it("throws for a malformed token", () => {
        expect(() => verifyToken("garbage", true)).toThrow();
      });
    });

    describe("enforce = false", () => {
      it("returns decoded token for a valid JWT", () => {
        const token = sign(validPayload, { expiresIn: "1h" });
        const result = verifyToken(token, false);
        expect(result.sub).toBe("user1");
      });

      it("returns decoded token even if expired (backward compat)", () => {
        const token = sign({
          ...validPayload,
          exp: Math.floor(Date.now() / 1000) - 10,
        });
        const result = verifyToken(token, false);
        expect(result.sub).toBe("user1");
      });

      it("throws for a completely malformed string", () => {
        expect(() => verifyToken("not-a-jwt", false)).toThrow();
      });
    });
  });

  describe("isTokenRevoked", () => {
    it("returns false when token has no origin_jti", () => {
      const token = { origin_jti: undefined } as unknown as Token;
      expect(isTokenRevoked(token, ["jti1"])).toBe(false);
    });

    it("returns false when revoked list is empty", () => {
      const token = { origin_jti: "jti1" } as unknown as Token;
      expect(isTokenRevoked(token, [])).toBe(false);
    });

    it("returns true when origin_jti is in revoked list", () => {
      const token = { origin_jti: "jti1" } as unknown as Token;
      expect(isTokenRevoked(token, ["jti1", "jti2"])).toBe(true);
    });

    it("returns false when origin_jti is not in revoked list", () => {
      const token = { origin_jti: "jti3" } as unknown as Token;
      expect(isTokenRevoked(token, ["jti1", "jti2"])).toBe(false);
    });
  });
});
