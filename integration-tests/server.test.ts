import supertest from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createServer } from "../src";
import { newMockCognitoService } from "../src/__tests__/mockCognitoService";
import { MockLogger } from "../src/__tests__/mockLogger";
import { newMockTokenGenerator } from "../src/__tests__/mockTokenGenerator";
import * as TDB from "../src/__tests__/testDataBuilder";
import {
  CodeMismatchError,
  CognitoError,
  InvalidPasswordError,
  NotAuthorizedError,
  UnsupportedError,
  UsernameExistsError,
} from "../src/errors";

describe("HTTP server", () => {
  describe("/", () => {
    it("errors with missing x-azm-target header", async () => {
      const router = vi.fn();
      const server = createServer(router, MockLogger as any, {});

      const response = await supertest(server.application).post("/");

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({ message: "Missing x-amz-target header" });
    });

    it("errors with an poorly formatted x-azm-target header", async () => {
      const router = vi.fn();
      const server = createServer(router, MockLogger as any, {});

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
        const route = vi.fn().mockResolvedValue({
          ok: true,
        });
        const router = (target: string) =>
          target === "valid" ? route : () => Promise.reject();
        const server = createServer(router, MockLogger as any, {});

        const response = await supertest(server.application)
          .post("/")
          .set("x-amz-target", "prefix.valid");

        expect(response.status).toEqual(200);
        expect(response.text).toEqual('{"ok":true}');
      });

      it("converts UnsupportedErrors from within a target route to a 500 error", async () => {
        const route = vi
          .fn()
          .mockRejectedValue(new UnsupportedError("integration test"));
        const router = (target: string) =>
          target === "valid" ? route : () => Promise.reject();
        const server = createServer(router, MockLogger as any, {});

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
          const route = vi.fn().mockRejectedValue(error);
          const router = (target: string) =>
            target === "valid" ? route : () => Promise.reject();
          const server = createServer(router, MockLogger as any, {});

          const response = await supertest(server.application)
            .post("/")
            .set("x-amz-target", "prefix.valid");

          expect(response.status).toEqual(400);
          expect(response.body).toEqual({
            __type: `${code}`,
            message,
          });
        },
      );
    });
  });

  describe("jwks endpoint", () => {
    it("responds with our public key", async () => {
      const server = createServer(vi.fn(), MockLogger as any, {});

      const response = await supertest(server.application).get(
        "/any-user-pool/.well-known/jwks.json",
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
      const server = createServer(vi.fn(), MockLogger as any, {});

      const response = await supertest(server.application).get(
        "/any-user-pool/.well-known/openid-configuration",
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        id_token_signing_alg_values_supported: ["RS256"],
        jwks_uri: `http://localhost:9229/any-user-pool/.well-known/jwks.json`,
        issuer: `http://localhost:9229/any-user-pool`,
      });
    });
  });

  describe("OAuth2 token endpoint", () => {
    const appClient = TDB.appClient({
      ClientSecret: "correct-secret",
      AllowedOAuthFlows: ["client_credentials"],
      AllowedOAuthScopes: ["api/read", "api/write"],
      UserPoolId: "test-pool",
    });

    const makeServices = (overrides?: {
      appClient?: typeof appClient | null;
    }) => {
      const mockCognito = newMockCognitoService();
      mockCognito.getAppClient.mockResolvedValue(
        overrides?.appClient !== undefined ? overrides.appClient : appClient,
      );
      const mockTokenGenerator = newMockTokenGenerator();
      mockTokenGenerator.generateClientCredentials.mockResolvedValue({
        AccessToken: "signed.jwt.token",
        ExpiresIn: 3600,
        TokenType: "Bearer" as const,
      });
      return { cognito: mockCognito, tokenGenerator: mockTokenGenerator };
    };

    it("returns 501 when no services are configured", async () => {
      const server = createServer(vi.fn(), MockLogger as any, {});

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({ grant_type: "client_credentials" });

      expect(response.status).toEqual(501);
      expect(response.body.error).toEqual("server_error");
    });

    it("returns 400 for unsupported grant_type", async () => {
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices(),
      );

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({ grant_type: "authorization_code" });

      expect(response.status).toEqual(400);
      expect(response.body.error).toEqual("unsupported_grant_type");
    });

    it("returns 401 when credentials are missing", async () => {
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices(),
      );

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({ grant_type: "client_credentials" });

      expect(response.status).toEqual(401);
      expect(response.body.error).toEqual("invalid_client");
    });

    it("returns 401 when client is not found", async () => {
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices({ appClient: null }),
      );

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({
          grant_type: "client_credentials",
          client_id: "unknown",
          client_secret: "x",
        });

      expect(response.status).toEqual(401);
      expect(response.body.error).toEqual("invalid_client");
    });

    it("returns 401 for wrong client secret via body params", async () => {
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices(),
      );

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({
          grant_type: "client_credentials",
          client_id: appClient.ClientId,
          client_secret: "wrong",
        });

      expect(response.status).toEqual(401);
      expect(response.body.error).toEqual("invalid_client");
    });

    it("returns 401 for wrong client secret via Basic auth header", async () => {
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices(),
      );
      const credentials = Buffer.from(
        `${appClient.ClientId}:wrong-secret`,
      ).toString("base64");

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .set("Authorization", `Basic ${credentials}`)
        .send({ grant_type: "client_credentials" });

      expect(response.status).toEqual(401);
      expect(response.body.error).toEqual("invalid_client");
    });

    it("returns 401 when Basic auth header has no colon separator", async () => {
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices(),
      );
      const malformed = Buffer.from("noclientidsecret").toString("base64");

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .set("Authorization", `Basic ${malformed}`)
        .send({ grant_type: "client_credentials" });

      expect(response.status).toEqual(401);
      expect(response.body.error).toEqual("invalid_client");
    });

    it("returns 401 when client belongs to a different user pool", async () => {
      const poolAClient = TDB.appClient({
        ClientSecret: "correct-secret",
        AllowedOAuthFlows: ["client_credentials"],
        AllowedOAuthScopes: ["api/read"],
        UserPoolId: "pool-a",
      });
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices({ appClient: poolAClient }),
      );

      const response = await supertest(server.application)
        .post("/pool-b/oauth2/token")
        .type("form")
        .send({
          grant_type: "client_credentials",
          client_id: poolAClient.ClientId,
          client_secret: "correct-secret",
        });

      expect(response.status).toEqual(401);
      expect(response.body.error).toEqual("invalid_client");
    });

    it("returns 400 when client_credentials flow is not allowed", async () => {
      const restrictedClient = TDB.appClient({
        ClientSecret: "correct-secret",
        AllowedOAuthFlows: ["implicit"],
        AllowedOAuthScopes: ["api/read"],
        UserPoolId: "test-pool",
      });
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices({ appClient: restrictedClient }),
      );

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({
          grant_type: "client_credentials",
          client_id: restrictedClient.ClientId,
          client_secret: "correct-secret",
        });

      expect(response.status).toEqual(400);
      expect(response.body.error).toEqual("unauthorized_client");
    });

    it("returns 400 for an unrecognised scope", async () => {
      const server = createServer(
        vi.fn(),
        MockLogger as any,
        {},
        makeServices(),
      );

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({
          grant_type: "client_credentials",
          client_id: appClient.ClientId,
          client_secret: "correct-secret",
          scope: "api/admin",
        });

      expect(response.status).toEqual(400);
      expect(response.body.error).toEqual("invalid_scope");
    });

    it("issues a token via body params", async () => {
      const services = makeServices();
      const server = createServer(vi.fn(), MockLogger as any, {}, services);

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({
          grant_type: "client_credentials",
          client_id: appClient.ClientId,
          client_secret: "correct-secret",
          scope: "api/read",
        });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        access_token: "signed.jwt.token",
        expires_in: 3600,
        token_type: "Bearer",
      });
      expect(
        services.tokenGenerator.generateClientCredentials,
      ).toHaveBeenCalledWith(expect.anything(), appClient, ["api/read"]);
    });

    it("issues a token via Basic auth header", async () => {
      const services = makeServices();
      const server = createServer(vi.fn(), MockLogger as any, {}, services);
      const credentials = Buffer.from(
        `${appClient.ClientId}:correct-secret`,
      ).toString("base64");

      const response = await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .set("Authorization", `Basic ${credentials}`)
        .send({ grant_type: "client_credentials" });

      expect(response.status).toEqual(200);
      expect(response.body.access_token).toEqual("signed.jwt.token");
    });

    it("uses all allowed scopes when no scope param is provided", async () => {
      const services = makeServices();
      const server = createServer(vi.fn(), MockLogger as any, {}, services);

      await supertest(server.application)
        .post("/test-pool/oauth2/token")
        .type("form")
        .send({
          grant_type: "client_credentials",
          client_id: appClient.ClientId,
          client_secret: "correct-secret",
        });

      expect(
        services.tokenGenerator.generateClientCredentials,
      ).toHaveBeenCalledWith(expect.anything(), appClient, [
        "api/read",
        "api/write",
      ]);
    });
  });
});
