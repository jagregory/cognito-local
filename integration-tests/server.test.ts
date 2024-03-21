import supertest from "supertest";
import { MockLogger } from "../src/__tests__/mockLogger";
import {
  CodeMismatchError,
  CognitoError,
  InvalidPasswordError,
  NotAuthorizedError,
  UnsupportedError,
  UsernameExistsError,
} from "../src/errors";
import { createServer } from "../src";

describe("HTTP server", () => {
  describe("/", () => {
    it("errors with missing x-azm-target header", async () => {
      const router = jest.fn();
      const server = createServer(router, MockLogger as any);

      const response = await supertest(server.application).post("/");

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({ message: "Missing x-amz-target header" });
    });

    it("errors with an poorly formatted x-azm-target header", async () => {
      const router = jest.fn();
      const server = createServer(router, MockLogger as any);

      const response = await supertest(server.application)
        .post("/")
        .set("x-amz-target", "bad-format");

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: "Invalid x-amz-target header",
      });
    });

    describe("a handled target", () => {
      it("returns the output of a matched target", async () => {
        const route = jest.fn().mockResolvedValue({
          ok: true,
        });
        const router = (target: string) =>
          target === "valid" ? route : () => Promise.reject();
        const server = createServer(router, MockLogger as any);

        const response = await supertest(server.application)
          .post("/")
          .set("x-amz-target", "prefix.valid");

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          ok: true,
        });
      });

      it("converts UnsupportedErrors from within a target route to a 500 error", async () => {
        const route = jest
          .fn()
          .mockRejectedValue(new UnsupportedError("integration test"));
        const router = (target: string) =>
          target === "valid" ? route : () => Promise.reject();
        const server = createServer(router, MockLogger as any);

        const response = await supertest(server.application)
          .post("/")
          .set("x-amz-target", "prefix.valid");

        expect(response.status).toEqual(500);
        expect(response.body).toEqual({
          __type: "CognitoLocal#Unsupported",
          message: "Cognito Local unsupported feature: integration test",
        });
      });

      it.each`
        error                                          | code                          | message
        ${new CognitoError("CognitoError", "message")} | ${"CognitoError"}             | ${"message"}
        ${new NotAuthorizedError()}                    | ${"NotAuthorizedException"}   | ${"User not authorized"}
        ${new UsernameExistsError()}                   | ${"UsernameExistsException"}  | ${"User already exists"}
        ${new CodeMismatchError()}                     | ${"CodeMismatchException"}    | ${"Incorrect confirmation code"}
        ${new InvalidPasswordError()}                  | ${"InvalidPasswordException"} | ${"Invalid password"}
      `(
        "it converts $code to the format Cognito SDK expects",
        async ({ error, code, message }) => {
          const route = jest.fn().mockRejectedValue(error);
          const router = (target: string) =>
            target === "valid" ? route : () => Promise.reject();
          const server = createServer(router, MockLogger as any);

          const response = await supertest(server.application)
            .post("/")
            .set("x-amz-target", "prefix.valid");

          expect(response.status).toEqual(400);
          expect(response.body).toEqual({
            __type: `${code}`,
            message,
          });
        }
      );
    });
  });

  describe("jwks endpoint", () => {
    it("responds with our public key", async () => {
      const server = createServer(jest.fn(), MockLogger as any);

      const response = await supertest(server.application).get(
        "/any-user-pool/.well-known/jwks.json"
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        keys: [
          {
            alg: "RS256",
            e: "AQAB",
            kid: "CognitoLocal",
            kty: "RSA",
            n: "2uLO7yh1_6Icfd89V3nNTc_qhfpDN7vEmOYlmJQlc9_RmOns26lg88fXXFntZESwHOm7_homO2Ih6NOtu4P5eskGs8d8VQMOQfF4YrP-pawVz-gh1S7eSvzZRDHBT4ItUuoiVP1B9HN_uScKxIqjmitpPqEQB_o2NJv8npCfqUAU-4KmxquGtjdmfctswSZGdz59M3CAYKDfuvLH9_vV6TRGgbUaUAXWC2WJrbbEXzK3XUDBrmF3Xo-yw8f3SgD3JOPl3HaaWMKL1zGVAsge7gQaGiJBzBurg5vwN61uDGGz0QZC1JqcUTl3cZnrx_L8isIR7074SJEuljIZRnCcjQ",
            use: "sig",
          },
        ],
      });
    });
  });

  describe("OpenId Configuration Endpoint", () => {
    it("responds with open id configuration", async () => {
      const server = createServer(jest.fn(), MockLogger as any);

      const response = await supertest(server.application).get(
        "/any-user-pool/.well-known/openid-configuration"
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        id_token_signing_alg_values_supported: ["RS256"],
        jwks_uri: `http://localhost:9229/any-user-pool/.well-known/jwks.json`,
        issuer: `http://localhost:9229/any-user-pool`,
      });
    });
  });
});
