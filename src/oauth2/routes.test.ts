import bodyParser from "body-parser";
import express from "express";
import supertest from "supertest";
import type { MockedObject } from "vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import * as TDB from "../__tests__/testDataBuilder";
import type { CognitoService, UserPoolService } from "../services";
import type { TokenGenerator } from "../services/tokenGenerator";
import { AuthorizationCodeStore } from "./authorizationCodeStore";
import { verifyS256 } from "./pkce";
import { attachOAuth2Routes } from "./routes";

const buildApp = (
  cognito: MockedObject<CognitoService>,
  tokenGenerator: MockedObject<TokenGenerator>,
) => {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use((req, _res, next) => {
    // Attach a minimal pino-compatible logger to req
    (req as any).log = {
      child: () => (req as any).log,
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    next();
  });

  const codeStore = new AuthorizationCodeStore();
  attachOAuth2Routes(app, { cognito, tokenGenerator } as any, codeStore);
  return { app, codeStore };
};

describe("OAuth2 routes", () => {
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockCognito: MockedObject<CognitoService>;
  let mockTokenGenerator: MockedObject<TokenGenerator>;
  let appClient: ReturnType<typeof TDB.appClient>;
  let user: ReturnType<typeof TDB.user>;

  beforeEach(() => {
    appClient = TDB.appClient({
      ClientId: "test-client-id",
      UserPoolId: "us-east-1_test",
      CallbackURLs: ["http://localhost:9876"],
      AllowedOAuthFlows: ["code"],
      AllowedOAuthScopes: ["openid", "email", "profile"],
    });
    user = TDB.user({
      Username: "testuser",
      Password: "Password123!",
      UserStatus: "CONFIRMED",
    });

    mockUserPoolService = newMockUserPoolService({ Id: "us-east-1_test" });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);
    mockUserPoolService.storeRefreshToken.mockResolvedValue(undefined);

    mockCognito = newMockCognitoService(mockUserPoolService);
    mockCognito.getAppClient.mockResolvedValue(appClient);
    mockCognito.getUserPoolForClientId.mockResolvedValue(mockUserPoolService);
    mockCognito.getUserPool.mockResolvedValue(mockUserPoolService);

    mockTokenGenerator = newMockTokenGenerator();
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access-token",
      IdToken: "id-token",
      RefreshToken: "refresh-token",
    });
  });

  describe("GET /oauth2/authorize", () => {
    it("returns 400 if client_id is missing", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app).get("/oauth2/authorize").query({
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: "abc",
        code_challenge_method: "S256",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_request");
    });

    it("returns 400 if response_type is not code", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app).get("/oauth2/authorize").query({
        client_id: "test-client-id",
        redirect_uri: "http://localhost:9876",
        response_type: "token",
        code_challenge: "abc",
        code_challenge_method: "S256",
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 if code_challenge_method is not S256", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app).get("/oauth2/authorize").query({
        client_id: "test-client-id",
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: "abc",
        code_challenge_method: "plain",
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 if redirect_uri is not registered", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app).get("/oauth2/authorize").query({
        client_id: "test-client-id",
        redirect_uri: "http://evil.com/callback",
        response_type: "code",
        code_challenge: "abc",
        code_challenge_method: "S256",
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 if client_id does not exist", async () => {
      mockCognito.getAppClient.mockResolvedValue(null);
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app).get("/oauth2/authorize").query({
        client_id: "unknown-client",
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: "abc",
        code_challenge_method: "S256",
      });
      expect(res.status).toBe(400);
    });

    it("returns HTML login form for valid request", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app).get("/oauth2/authorize").query({
        client_id: "test-client-id",
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: "challenge123",
        code_challenge_method: "S256",
        scope: "openid email",
        state: "my-state",
      });
      expect(res.status).toBe(200);
      expect(res.type).toMatch(/html/);
      expect(res.text).toContain("<form");
      expect(res.text).toContain('name="username"');
      expect(res.text).toContain('name="password"');
      expect(res.text).toContain("challenge123");
      expect(res.text).toContain("my-state");
    });
  });

  describe("POST /oauth2/authorize", () => {
    const validFormData = {
      client_id: "test-client-id",
      redirect_uri: "http://localhost:9876",
      response_type: "code",
      code_challenge: "challenge123",
      code_challenge_method: "S256",
      scope: "openid email",
      state: "my-state",
      username: "testuser",
      password: "Password123!",
    };

    it("redirects with code and state on valid credentials", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app)
        .post("/oauth2/authorize")
        .type("form")
        .send(validFormData);
      expect(res.status).toBe(302);
      const location = new URL(res.header.location);
      expect(location.hostname).toBe("localhost");
      expect(location.port).toBe("9876");
      expect(location.searchParams.get("state")).toBe("my-state");
      expect(location.searchParams.get("code")).toBeTruthy();
    });

    it("shows login form with error on wrong password", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue({
        ...user,
        Password: "different-password",
      });
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app)
        .post("/oauth2/authorize")
        .type("form")
        .send(validFormData);
      expect(res.status).toBe(200);
      expect(res.text).toContain("Incorrect username or password");
    });

    it("shows login form with error when user not found", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue(null);
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app)
        .post("/oauth2/authorize")
        .type("form")
        .send(validFormData);
      expect(res.status).toBe(200);
      expect(res.text).toContain("Incorrect username or password");
    });

    it("shows login form with error for unconfirmed user", async () => {
      mockUserPoolService.getUserByUsername.mockResolvedValue({
        ...user,
        UserStatus: "UNCONFIRMED",
      });
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app)
        .post("/oauth2/authorize")
        .type("form")
        .send(validFormData);
      expect(res.status).toBe(200);
      expect(res.text).toContain("Incorrect username or password");
    });

    it("returns 400 if redirect_uri not registered", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app)
        .post("/oauth2/authorize")
        .type("form")
        .send({ ...validFormData, redirect_uri: "http://evil.com" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /oauth2/token", () => {
    describe("grant_type=authorization_code", () => {
      it("exchanges a valid code for tokens", async () => {
        const { app, codeStore } = buildApp(mockCognito, mockTokenGenerator);

        const code = codeStore.create({
          clientId: "test-client-id",
          userPoolId: "us-east-1_test",
          username: "testuser",
          redirectUri: "http://localhost:9876",
          codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          scope: "openid email",
          state: "my-state",
        });

        const res = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send({
            grant_type: "authorization_code",
            code,
            redirect_uri: "http://localhost:9876",
            client_id: "test-client-id",
            // Verifier that produces the challenge above
            code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
          });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          access_token: "access-token",
          id_token: "id-token",
          refresh_token: "refresh-token",
          token_type: "Bearer",
          expires_in: 3600,
        });
      });

      it("returns 400 for expired or unknown code", async () => {
        const { app } = buildApp(mockCognito, mockTokenGenerator);
        const res = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send({
            grant_type: "authorization_code",
            code: "nonexistent-code",
            redirect_uri: "http://localhost:9876",
            client_id: "test-client-id",
            code_verifier: "some-verifier",
          });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("invalid_grant");
      });

      it("returns 400 when code_verifier does not match code_challenge", async () => {
        const { app, codeStore } = buildApp(mockCognito, mockTokenGenerator);
        const code = codeStore.create({
          clientId: "test-client-id",
          userPoolId: "us-east-1_test",
          username: "testuser",
          redirectUri: "http://localhost:9876",
          codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          scope: "openid",
          state: undefined,
        });

        const res = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send({
            grant_type: "authorization_code",
            code,
            redirect_uri: "http://localhost:9876",
            client_id: "test-client-id",
            code_verifier: "wrong-verifier",
          });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("invalid_grant");
      });

      it("returns 400 when redirect_uri does not match stored value", async () => {
        const { app, codeStore } = buildApp(mockCognito, mockTokenGenerator);
        const code = codeStore.create({
          clientId: "test-client-id",
          userPoolId: "us-east-1_test",
          username: "testuser",
          redirectUri: "http://localhost:9876",
          codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          scope: "openid",
          state: undefined,
        });

        const res = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send({
            grant_type: "authorization_code",
            code,
            redirect_uri: "http://localhost:9999",
            client_id: "test-client-id",
            code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
          });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("invalid_grant");
      });

      it("invalidates the code after first use", async () => {
        const { app, codeStore } = buildApp(mockCognito, mockTokenGenerator);
        const code = codeStore.create({
          clientId: "test-client-id",
          userPoolId: "us-east-1_test",
          username: "testuser",
          redirectUri: "http://localhost:9876",
          codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          scope: "openid",
          state: undefined,
        });

        const body = {
          grant_type: "authorization_code",
          code,
          redirect_uri: "http://localhost:9876",
          client_id: "test-client-id",
          code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        };

        const first = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send(body);
        expect(first.status).toBe(200);

        const second = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send(body);
        expect(second.status).toBe(400);
        expect(second.body.error).toBe("invalid_grant");
      });
    });

    describe("grant_type=refresh_token", () => {
      it("exchanges a refresh token for new access and id tokens", async () => {
        mockUserPoolService.getUserByRefreshToken.mockResolvedValue(user);
        const { app } = buildApp(mockCognito, mockTokenGenerator);

        const res = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send({
            grant_type: "refresh_token",
            refresh_token: "some-refresh-token",
            client_id: "test-client-id",
          });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          access_token: "access-token",
          id_token: "id-token",
          token_type: "Bearer",
          expires_in: 3600,
        });
        expect(res.body.refresh_token).toBeUndefined();
      });

      it("returns 400 for invalid refresh token", async () => {
        mockUserPoolService.getUserByRefreshToken.mockResolvedValue(null);
        const { app } = buildApp(mockCognito, mockTokenGenerator);

        const res = await supertest(app)
          .post("/oauth2/token")
          .type("form")
          .send({
            grant_type: "refresh_token",
            refresh_token: "bad-token",
            client_id: "test-client-id",
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("invalid_grant");
      });
    });

    it("returns 400 for unsupported grant_type", async () => {
      const { app } = buildApp(mockCognito, mockTokenGenerator);
      const res = await supertest(app)
        .post("/oauth2/token")
        .type("form")
        .send({ grant_type: "client_credentials" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("unsupported_grant_type");
    });
  });
});

describe("PKCE verifyS256", () => {
  it("returns true for a valid code_verifier / code_challenge pair", () => {
    // RFC 7636 Appendix B test vector
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(verifyS256(verifier, challenge)).toBe(true);
  });

  it("returns false for a wrong verifier", () => {
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(verifyS256("wrong-verifier", challenge)).toBe(false);
  });
});

describe("AuthorizationCodeStore", () => {
  it("creates and consumes a code", () => {
    const store = new AuthorizationCodeStore();
    const data = {
      clientId: "c1",
      userPoolId: "p1",
      username: "u1",
      redirectUri: "http://localhost",
      codeChallenge: "ch",
      scope: "openid",
      state: "s1",
    };
    const code = store.create(data);
    expect(code).toBeTruthy();
    expect(store.consume(code)).toEqual(data);
  });

  it("returns null for unknown code", () => {
    const store = new AuthorizationCodeStore();
    expect(store.consume("nonexistent")).toBeNull();
  });

  it("returns null when code is consumed a second time", () => {
    const store = new AuthorizationCodeStore();
    const code = store.create({
      clientId: "c1",
      userPoolId: "p1",
      username: "u1",
      redirectUri: "http://localhost",
      codeChallenge: "ch",
      scope: "openid",
      state: undefined,
    });
    store.consume(code);
    expect(store.consume(code)).toBeNull();
  });
});
