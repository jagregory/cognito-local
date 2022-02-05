import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockTokenGenerator } from "../mocks/MockTokenGenerator";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockTriggers } from "../mocks/MockTriggers";
import { MockContext } from "../mocks/MockContext";

import { CognitoService, Triggers, UserPoolService } from "../services";
import { TokenGenerator } from "../services/tokenGenerator";
import {
  AdminInitiateAuth,
  AdminInitiateAuthTarget,
} from "./adminInitiateAuth";
import { MockUser } from "../mocks/MockUser";

describe("AdminInitiateAuth target", () => {
  let adminInitiateAuth: AdminInitiateAuthTarget;

  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  let mockTriggers: jest.Mocked<Triggers>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    mockCognitoService = MockCognitoService(mockUserPoolService);
    mockTriggers = MockTriggers();
    mockTokenGenerator = MockTokenGenerator();
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

    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const response = await adminInitiateAuth(MockContext, {
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      ClientId: "clientId",
      UserPoolId: "test",
      AuthParameters: {
        USERNAME: existingUser.Username,
        PASSWORD: existingUser.Password,
      },
      ClientMetadata: {
        client: "metadata",
      },
    });

    expect(mockUserPoolService.storeRefreshToken).toHaveBeenCalledWith(
      MockContext,
      response.AuthenticationResult?.RefreshToken,
      existingUser
    );

    expect(response.AuthenticationResult?.AccessToken).toEqual("access");
    expect(response.AuthenticationResult?.IdToken).toEqual("id");
    expect(response.AuthenticationResult?.RefreshToken).toEqual("refresh");

    expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
      MockContext,
      existingUser,
      "clientId",
      "test",
      {
        client: "metadata",
      },
      "Authentication"
    );
  });

  it("supports REFRESH_TOKEN_AUTH", async () => {
    mockTokenGenerator.generate.mockResolvedValue({
      AccessToken: "access",
      IdToken: "id",
      RefreshToken: "refresh",
    });

    const existingUser = MockUser({
      RefreshTokens: ["refresh token"],
    });

    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);

    const response = await adminInitiateAuth(MockContext, {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: "clientId",
      UserPoolId: "test",
      AuthParameters: {
        REFRESH_TOKEN: "refresh token",
      },
      ClientMetadata: {
        client: "metadata",
      },
    });

    expect(mockUserPoolService.getUserByRefreshToken).toHaveBeenCalledWith(
      MockContext,
      "refresh token"
    );
    expect(mockUserPoolService.storeRefreshToken).not.toHaveBeenCalled();

    expect(response.AuthenticationResult?.AccessToken).toEqual("access");
    expect(response.AuthenticationResult?.IdToken).toEqual("id");

    // does not return a refresh token as part of a refresh token flow
    expect(response.AuthenticationResult?.RefreshToken).not.toBeDefined();

    expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
      MockContext,
      existingUser,
      "clientId",
      "test",
      {
        client: "metadata",
      },
      "RefreshTokens"
    );
  });
});
