import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { NotAuthorizedError } from "../errors";
import PrivateKey from "../keys/cognitoLocal.private.json";
import { DefaultConfig } from "../server/config";
import type { CognitoService, UserPoolService } from "../services";
import type { TokenGenerator } from "../services/tokenGenerator";
import {
  GetTokensFromRefreshToken,
  type GetTokensFromRefreshTokenTarget,
} from "./getTokensFromRefreshToken";

describe("GetTokensFromRefreshToken target", () => {
  let getTokensFromRefreshToken: GetTokensFromRefreshTokenTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockCognitoService: MockedObject<CognitoService>;
  let mockTokenGenerator: MockedObject<TokenGenerator>;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });
    mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);
    mockTokenGenerator = newMockTokenGenerator();

    getTokensFromRefreshToken = GetTokensFromRefreshToken({
      config: DefaultConfig,
      cognito: mockCognitoService,
      tokenGenerator: mockTokenGenerator,
    });
  });

  it("returns new access and id tokens", async () => {
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "new-access",
      IdToken: "new-id",
      RefreshToken: "new-refresh",
    });

    const existingUser = TDB.user({
      RefreshTokens: ["refresh-token"],
    });

    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

    const response = await getTokensFromRefreshToken(TestContext, {
      ClientId: userPoolClient.ClientId,
      RefreshToken: "refresh-token",
    });

    expect(response.AuthenticationResult.AccessToken).toEqual("new-access");
    expect(response.AuthenticationResult.IdToken).toEqual("new-id");
    expect(response.AuthenticationResult.RefreshToken).toBeUndefined();
    expect(response.AuthenticationResult.TokenType).toEqual("Bearer");
  });

  it("throws when app client not found", async () => {
    mockCognitoService.getAppClient.mockResolvedValue(null);

    await expect(
      getTokensFromRefreshToken(TestContext, {
        ClientId: "invalid",
        RefreshToken: "token",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws when client secret required but not provided", async () => {
    mockCognitoService.getAppClient.mockResolvedValue(
      TDB.appClient({ ClientSecret: "secret" }),
    );

    await expect(
      getTokensFromRefreshToken(TestContext, {
        ClientId: userPoolClient.ClientId,
        RefreshToken: "token",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws when client secret does not match", async () => {
    mockCognitoService.getAppClient.mockResolvedValue(
      TDB.appClient({ ClientSecret: "secret" }),
    );

    await expect(
      getTokensFromRefreshToken(TestContext, {
        ClientId: userPoolClient.ClientId,
        RefreshToken: "token",
        ClientSecret: "wrong",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("succeeds when client secret matches", async () => {
    const clientWithSecret = TDB.appClient({ ClientSecret: "secret" });
    mockCognitoService.getAppClient.mockResolvedValue(clientWithSecret);

    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access",
      IdToken: "id",
      RefreshToken: "refresh",
    });

    const existingUser = TDB.user({ RefreshTokens: ["token"] });
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

    const response = await getTokensFromRefreshToken(TestContext, {
      ClientId: clientWithSecret.ClientId,
      RefreshToken: "token",
      ClientSecret: "secret",
    });

    expect(response.AuthenticationResult.AccessToken).toEqual("access");
  });

  it("throws when refresh token not found for any user", async () => {
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(null);

    await expect(
      getTokensFromRefreshToken(TestContext, {
        ClientId: userPoolClient.ClientId,
        RefreshToken: "unknown-token",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws for expired refresh token when VerifyTokens is enabled", async () => {
    const verifyTarget = GetTokensFromRefreshToken({
      config: {
        ...DefaultConfig,
        TokenConfig: { ...DefaultConfig.TokenConfig, VerifyTokens: true },
      },
      cognito: mockCognitoService,
      tokenGenerator: mockTokenGenerator,
    });

    const expiredToken = jwt.sign(
      {
        "cognito:username": "user1",
        exp: Math.floor(Date.now() / 1000) - 10,
      },
      PrivateKey.pem,
      { algorithm: "RS256" },
    );

    await expect(
      verifyTarget(TestContext, {
        ClientId: userPoolClient.ClientId,
        RefreshToken: expiredToken,
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws when refresh token jti has been revoked", async () => {
    const refreshToken = jwt.sign(
      { "cognito:username": "user1", jti: "revoked-jti" },
      PrivateKey.pem,
      { algorithm: "RS256", expiresIn: "7d" },
    );

    const existingUser = TDB.user({
      RefreshTokens: [refreshToken],
      RevokedRefreshTokenJtis: ["revoked-jti"],
    });

    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);

    await expect(
      getTokensFromRefreshToken(TestContext, {
        ClientId: userPoolClient.ClientId,
        RefreshToken: refreshToken,
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("passes ClientMetadata to token generator", async () => {
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access",
      IdToken: "id",
      RefreshToken: "refresh",
    });

    const existingUser = TDB.user({ RefreshTokens: ["token"] });
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

    await getTokensFromRefreshToken(TestContext, {
      ClientId: userPoolClient.ClientId,
      RefreshToken: "token",
      ClientMetadata: { key: "value" },
    });

    expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
      TestContext,
      existingUser,
      [],
      userPoolClient,
      { key: "value" },
      "RefreshTokens",
    );
  });
});
