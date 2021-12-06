import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { ClockFake } from "../__tests__/clockFake";
import * as TDB from "../__tests__/testDataBuilder";
import { DefaultConfig } from "../server/config";
import {
  CognitoService,
  Messages,
  Triggers,
  UserPoolService,
} from "../services";
import {
  AdminInitiateAuth,
  AdminInitiateAuthTarget,
} from "./adminInitiateAuth";
import { newMockMessages } from "../__tests__/mockMessages";

describe("AdminInitiateAuth target", () => {
  let adminInitiateAuth: AdminInitiateAuthTarget;

  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockMessages: jest.Mocked<Messages>;

  let mockTriggers: jest.Mocked<Triggers>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockCognitoService = newMockCognitoService(mockUserPoolService);

    mockMessages = newMockMessages();
    mockMessages.signUp.mockResolvedValue({
      emailSubject: "Mock message",
    });

    mockTriggers = newMockTriggers();

    adminInitiateAuth = AdminInitiateAuth({
      clock: new ClockFake(new Date(0)),
      config: {
        ...DefaultConfig,
        TokenConfig: {
          IssuerDomain: "http://issuer-domain",
        },
      },
      triggers: mockTriggers,
      cognito: mockCognitoService,
    });
  });

  it("create tokens with username, password and admin user password auth flow", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const response = await adminInitiateAuth({
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      ClientId: "clientId",
      UserPoolId: "test",
      AuthParameters: {
        USERNAME: existingUser.Username,
        PASSWORD: existingUser.Password,
      },
    });

    expect(mockUserPoolService.storeRefreshToken).toHaveBeenCalledWith(
      response.AuthenticationResult?.RefreshToken,
      existingUser
    );

    expect(response.AuthenticationResult?.AccessToken).toBeTruthy();
    expect(response.AuthenticationResult?.IdToken).toBeTruthy();
    expect(response.AuthenticationResult?.RefreshToken).toBeTruthy();
  });

  it("supports REFRESH_TOKEN_AUTH", async () => {
    const existingUser = TDB.user({
      RefreshTokens: ["refresh token"],
    });

    mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);

    const response = await adminInitiateAuth({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: "clientId",
      UserPoolId: "test",
      AuthParameters: {
        REFRESH_TOKEN: "refresh token",
      },
    });

    expect(mockUserPoolService.getUserByRefreshToken).toHaveBeenCalledWith(
      "refresh token"
    );
    expect(mockUserPoolService.storeRefreshToken).not.toHaveBeenCalled();

    expect(response.AuthenticationResult?.AccessToken).toBeTruthy();
    expect(response.AuthenticationResult?.IdToken).toBeTruthy();

    // does not return a refresh token as part of a refresh token flow
    expect(response.AuthenticationResult?.RefreshToken).not.toBeDefined();
  });
});
