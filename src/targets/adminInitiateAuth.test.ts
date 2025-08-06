import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { CognitoService, Triggers, UserPoolService } from "../services";
import type { TokenGenerator } from "../services/tokenGenerator";
import {
  AdminInitiateAuth,
  type AdminInitiateAuthTarget,
} from "./adminInitiateAuth";

describe("AdminInitiateAuth target", () => {
  let adminInitiateAuth: AdminInitiateAuthTarget;

  let mockCognitoService: MockedObject<CognitoService>;
  let mockTokenGenerator: MockedObject<TokenGenerator>;
  let mockTriggers: MockedObject<Triggers>;
  let mockUserPoolService: MockedObject<UserPoolService>;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });
    mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);
    mockTriggers = newMockTriggers();
    mockTokenGenerator = newMockTokenGenerator();
    adminInitiateAuth = AdminInitiateAuth({
      triggers: mockTriggers,
      cognito: mockCognitoService,
      tokenGenerator: mockTokenGenerator,
    });
  });

  it("create tokens with username, password and admin user password auth flow", async () => {
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access",
      IdToken: "id",
      RefreshToken: "refresh",
    });

    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

    const response = await adminInitiateAuth(TestContext, {
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      ClientId: userPoolClient.ClientId,
      UserPoolId: userPoolClient.UserPoolId,
      AuthParameters: {
        USERNAME: existingUser.Username,
        PASSWORD: existingUser.Password,
      },
      ClientMetadata: {
        client: "metadata",
      },
    });

    expect(mockUserPoolService.storeRefreshToken).toHaveBeenCalledWith(
      TestContext,
      response.AuthenticationResult?.RefreshToken,
      existingUser,
    );

    expect(response.AuthenticationResult?.AccessToken).toEqual("access");
    expect(response.AuthenticationResult?.IdToken).toEqual("id");
    expect(response.AuthenticationResult?.RefreshToken).toEqual("refresh");

    expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
      TestContext,
      existingUser,
      [],
      userPoolClient,
      {
        client: "metadata",
      },
      "Authentication",
    );
  });

  it("supports REFRESH_TOKEN_AUTH", async () => {
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access",
      IdToken: "id",
      RefreshToken: "refresh",
    });

    const existingUser = TDB.user({
      RefreshTokens: ["refresh token"],
    });

    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);
    mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

    const response = await adminInitiateAuth(TestContext, {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: userPoolClient.ClientId,
      UserPoolId: userPoolClient.UserPoolId,
      AuthParameters: {
        REFRESH_TOKEN: "refresh token",
      },
      ClientMetadata: {
        client: "metadata",
      },
    });

    expect(mockUserPoolService.getUserByRefreshToken).toHaveBeenCalledWith(
      TestContext,
      "refresh token",
    );
    expect(mockUserPoolService.storeRefreshToken).not.toHaveBeenCalled();

    expect(response.AuthenticationResult?.AccessToken).toEqual("access");
    expect(response.AuthenticationResult?.IdToken).toEqual("id");

    // does not return a refresh token as part of a refresh token flow
    expect(response.AuthenticationResult?.RefreshToken).not.toBeDefined();

    expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
      TestContext,
      existingUser,
      [],
      userPoolClient,
      {
        client: "metadata",
      },
      "RefreshTokens",
    );
  });
});
