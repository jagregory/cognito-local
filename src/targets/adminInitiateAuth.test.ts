import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { NotAuthorizedError } from "../errors";
import {
  CognitoService,
  Messages,
  Triggers,
  UserPoolService,
} from "../services";
import { TokenGenerator } from "../services/tokenGenerator";
import { User } from "../services/userPoolService";
import {
  AdminInitiateAuth,
  AdminInitiateAuthTarget,
} from "./adminInitiateAuth";

describe("AdminInitiateAuth target", () => {
  let adminInitiateAuth: AdminInitiateAuthTarget;

  let mockCognitoService: jest.Mocked<CognitoService>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });
    mockMessages = newMockMessages();
    mockOtp = jest.fn().mockReturnValue("123456");
    mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);
    mockTriggers = newMockTriggers();
    mockTokenGenerator = newMockTokenGenerator();
    adminInitiateAuth = AdminInitiateAuth({
      triggers: mockTriggers,
      cognito: mockCognitoService,
      messages: mockMessages,
      otp: mockOtp,
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
      existingUser
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
      "Authentication"
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
      "refresh token"
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
      "RefreshTokens"
    );
  });

  describe("when password matches", () => {
    describe("when MFA is ON", () => {
      beforeEach(() => {
        mockUserPoolService.options.MfaConfiguration = "ON";
      });

      describe("when user has SMS_MFA configured", () => {
        let user: User;

        beforeEach(() => {
          user = TDB.user({
            Attributes: [
              {
                Name: "phone_number",
                Value: "0411000111",
              },
            ],
            MFAOptions: [
              {
                DeliveryMedium: "SMS",
                AttributeName: "phone_number",
              },
            ],
          });
          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
        });

        it("sends MFA code to user", async () => {
          const output = await adminInitiateAuth(TestContext, {
            ClientId: userPoolClient.ClientId,
            UserPoolId: userPoolClient.UserPoolId,
            AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
            },
          });

          expect(output).toBeDefined();

          expect(mockMessages.deliver).toHaveBeenCalledWith(
            TestContext,
            "Authentication",
            userPoolClient.ClientId,
            userPoolClient.UserPoolId,
            user,
            "123456",
            undefined,
            {
              AttributeName: "phone_number",
              DeliveryMedium: "SMS",
              Destination: "0411000111",
            }
          );

          // also saves the code on the user for comparison later
          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            {
              ...user,
              MFACode: "123456",
            }
          );
        });
      });

      describe("when user doesn't have MFA configured", () => {
        const user = TDB.user({ MFAOptions: undefined });

        beforeEach(() => {
          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
        });

        it("throws an exception", async () => {
          await expect(
            adminInitiateAuth(TestContext, {
              ClientId: userPoolClient.ClientId,
              UserPoolId: userPoolClient.UserPoolId,
              AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
              },
            })
          ).rejects.toBeInstanceOf(NotAuthorizedError);
        });
      });
    });

    describe("when MFA is OPTIONAL", () => {
      beforeEach(() => {
        mockUserPoolService.options.MfaConfiguration = "OPTIONAL";
      });

      describe("when user has SMS_MFA configured", () => {
        let user: User;

        beforeEach(() => {
          user = TDB.user({
            Attributes: [
              {
                Name: "phone_number",
                Value: "0411000111",
              },
            ],
            MFAOptions: [
              {
                DeliveryMedium: "SMS",
                AttributeName: "phone_number",
              },
            ],
          });
          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
        });

        it("sends MFA code to user", async () => {
          const output = await adminInitiateAuth(TestContext, {
            ClientId: userPoolClient.ClientId,
            UserPoolId: userPoolClient.UserPoolId,
            ClientMetadata: {
              client: "metadata",
            },
            AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
            },
          });

          expect(output).toBeDefined();

          expect(mockMessages.deliver).toHaveBeenCalledWith(
            TestContext,
            "Authentication",
            userPoolClient.ClientId,
            userPoolClient.UserPoolId,
            user,
            "123456",
            {
              client: "metadata",
            },
            {
              AttributeName: "phone_number",
              DeliveryMedium: "SMS",
              Destination: "0411000111",
            }
          );

          // also saves the code on the user for comparison later
          expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
            TestContext,
            {
              ...user,
              MFACode: "123456",
            }
          );
        });
      });

      describe("when user doesn't have MFA configured", () => {
        const user = TDB.user({
          MFAOptions: undefined,
        });

        beforeEach(() => {
          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
        });

        it("generates tokens", async () => {
          mockTokenGenerator.generate.mockResolvedValue({
            AccessToken: "access",
            IdToken: "id",
            RefreshToken: "refresh",
          });
          mockUserPoolService.listUserGroupMembership.mockResolvedValue([]);

          const output = await adminInitiateAuth(TestContext, {
            ClientId: userPoolClient.ClientId,
            UserPoolId: userPoolClient.UserPoolId,
            AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
            },
            ClientMetadata: {
              client: "metadata",
            },
          });

          expect(output).toBeDefined();

          expect(output.AuthenticationResult?.AccessToken).toEqual("access");
          expect(output.AuthenticationResult?.IdToken).toEqual("id");
          expect(output.AuthenticationResult?.RefreshToken).toEqual("refresh");

          expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
            TestContext,
            user,
            [],
            userPoolClient,
            { client: "metadata" },
            "Authentication"
          );
        });
      });
    });
  });
});
