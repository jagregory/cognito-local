import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { NotAuthorizedError } from "../errors";
import type { CognitoService, UserPoolService } from "../services";
import { RevokeToken, type RevokeTokenTarget } from "./revokeToken";

describe("RevokeToken target", () => {
  let revokeToken: RevokeTokenTarget;

  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockCognitoService: MockedObject<CognitoService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);

    // Default: app client with no secret
    mockCognitoService.getAppClient.mockResolvedValue(TDB.appClient());

    revokeToken = RevokeToken({
      cognito: mockCognitoService,
    });
  });

  it("removes refresh token from user", async () => {
    const existingUser = TDB.user();
    existingUser.RefreshTokens.push("token");

    mockUserPoolService.listUsers.mockResolvedValue([existingUser]);

    await revokeToken(TestContext, {
      ClientId: "clientId",
      Token: "token",
    });

    expect(mockUserPoolService.saveUser).toBeCalledWith(
      TestContext,
      expect.objectContaining({
        RefreshTokens: [],
      }),
    );
  });

  it("returns empty response when token not found", async () => {
    mockUserPoolService.listUsers.mockResolvedValue([TDB.user()]);

    const result = await revokeToken(TestContext, {
      ClientId: "clientId",
      Token: "nonexistent-token",
    });

    expect(result).toEqual({});
    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });

  it("throws when app client not found", async () => {
    mockCognitoService.getAppClient.mockResolvedValue(null);

    await expect(
      revokeToken(TestContext, {
        ClientId: "invalidClientId",
        Token: "token",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws when client secret is required but not provided", async () => {
    mockCognitoService.getAppClient.mockResolvedValue(
      TDB.appClient({ ClientSecret: "my-secret" }),
    );

    await expect(
      revokeToken(TestContext, {
        ClientId: "clientId",
        Token: "token",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws when client secret does not match", async () => {
    mockCognitoService.getAppClient.mockResolvedValue(
      TDB.appClient({ ClientSecret: "my-secret" }),
    );

    await expect(
      revokeToken(TestContext, {
        ClientId: "clientId",
        Token: "token",
        ClientSecret: "wrong-secret",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("succeeds when client secret matches", async () => {
    const existingUser = TDB.user();
    existingUser.RefreshTokens.push("token");

    mockCognitoService.getAppClient.mockResolvedValue(
      TDB.appClient({ ClientSecret: "my-secret" }),
    );
    mockUserPoolService.listUsers.mockResolvedValue([existingUser]);

    await revokeToken(TestContext, {
      ClientId: "clientId",
      Token: "token",
      ClientSecret: "my-secret",
    });

    expect(mockUserPoolService.saveUser).toBeCalledWith(
      TestContext,
      expect.objectContaining({
        RefreshTokens: [],
      }),
    );
  });
});
