import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { NotAuthorizedError } from "../errors";
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

  const userPoolClient = TDB.appClient({ ClientId: "test-client" });

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockTokenGenerator = newMockTokenGenerator();
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);

    getTokensFromRefreshToken = GetTokensFromRefreshToken({
      cognito: mockCognitoService,
      tokenGenerator: mockTokenGenerator,
    });
  });

  it("generates new tokens from a valid refresh token", async () => {
    const user = TDB.user({ RefreshTokens: ["valid-refresh-token"] });
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(user);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "new-access-token",
      IdToken: "new-id-token",
      RefreshToken: "new-refresh-token",
    });

    const result = await getTokensFromRefreshToken(TestContext, {
      RefreshToken: "valid-refresh-token",
      ClientId: "test-client",
    });

    expect(result.AuthenticationResult).toEqual({
      AccessToken: "new-access-token",
      IdToken: "new-id-token",
      ExpiresIn: 3600,
      TokenType: "Bearer",
    });
    expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
      TestContext,
      user,
      [],
      userPoolClient,
      undefined,
      "RefreshTokens",
    );
  });

  it("throws NotAuthorizedError if user not found by refresh token", async () => {
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(null);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);

    await expect(
      getTokensFromRefreshToken(TestContext, {
        RefreshToken: "invalid-token",
        ClientId: "test-client",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws NotAuthorizedError if app client not found", async () => {
    const user = TDB.user();
    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(user);
    mockCognitoService.getAppClient.mockResolvedValue(null);

    await expect(
      getTokensFromRefreshToken(TestContext, {
        RefreshToken: "some-token",
        ClientId: "unknown-client",
      }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
