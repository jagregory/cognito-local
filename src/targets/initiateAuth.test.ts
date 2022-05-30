import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockTokenGenerator } from "../__tests__/mockTokenGenerator";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UUID } from "../__tests__/patterns";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
} from "../errors";
import { Messages, Triggers, UserPoolService } from "../services";
import { TokenGenerator } from "../services/tokenGenerator";
import { attributesToRecord, User } from "../services/userPoolService";
import { InitiateAuth, InitiateAuthTarget } from "./initiateAuth";

describe("InitiateAuth target", () => {
  let initiateAuth: InitiateAuthTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;
  const userPoolClient = TDB.appClient();

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService({
      Id: userPoolClient.UserPoolId,
    });
    mockMessages = newMockMessages();
    mockOtp = jest.fn().mockReturnValue("123456");
    mockTriggers = newMockTriggers();
    mockTokenGenerator = newMockTokenGenerator();

    const mockCognitoService = newMockCognitoService(mockUserPoolService);
    mockCognitoService.getAppClient.mockResolvedValue(userPoolClient);

    initiateAuth = InitiateAuth({
      cognito: mockCognitoService,
      messages: mockMessages,
      otp: mockOtp,
      triggers: mockTriggers,
      tokenGenerator: mockTokenGenerator,
    });
  });

  describe("USER_PASSWORD_AUTH auth flow", () => {
    it("throws if AuthParameters not provided", async () => {
      await expect(
        initiateAuth(TestContext, {
          ClientId: userPoolClient.ClientId,
          AuthFlow: "USER_PASSWORD_AUTH",
        })
      ).rejects.toEqual(
        new InvalidParameterError("Missing required parameter authParameters")
      );
    });

    it("throws if password is incorrect", async () => {
      const user = TDB.user();

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await expect(
        initiateAuth(TestContext, {
          ClientId: userPoolClient.ClientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: user.Username,
            PASSWORD: "bad-password",
          },
        })
      ).rejects.toBeInstanceOf(InvalidPasswordError);
    });

    it("throws when user requires reset", async () => {
      const user = TDB.user({
        UserStatus: "RESET_REQUIRED",
      });

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await expect(
        initiateAuth(TestContext, {
          ClientId: userPoolClient.ClientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: user.Username,
            PASSWORD: "bad-password",
          },
        })
      ).rejects.toBeInstanceOf(PasswordResetRequiredError);
    });

    describe("when user doesn't exist", () => {
      describe("when User Migration trigger is enabled", () => {
        it("invokes the User Migration trigger and continues", async () => {
          mockTokenGenerator.generate.mockResolvedValue({
            AccessToken: "access",
            IdToken: "id",
            RefreshToken: "refresh",
          });

          const user = TDB.user();

          mockTriggers.enabled.mockReturnValue(true);
          mockTriggers.userMigration.mockResolvedValue(user);
          mockUserPoolService.getUserByUsername.mockResolvedValue(null);

          const output = await initiateAuth(TestContext, {
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
            },
            ClientId: userPoolClient.ClientId,
            ClientMetadata: {
              client: "metadata",
            },
          });

          expect(mockTriggers.userMigration).toHaveBeenCalledWith(TestContext, {
            clientId: userPoolClient.ClientId,
            clientMetadata: undefined,
            password: user.Password,
            userAttributes: [],
            userPoolId: userPoolClient.UserPoolId,
            username: user.Username,
            validationData: { client: "metadata" },
          });

          expect(output).toBeDefined();
          expect(output.AuthenticationResult?.AccessToken).toBeDefined();
        });
      });

      describe("when User Migration trigger is disabled", () => {
        it("throws", async () => {
          mockTriggers.enabled.mockReturnValue(false);
          mockUserPoolService.getUserByUsername.mockResolvedValue(null);

          await expect(
            initiateAuth(TestContext, {
              ClientId: userPoolClient.ClientId,
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "username",
                PASSWORD: "password",
              },
            })
          ).rejects.toBeInstanceOf(NotAuthorizedError);
        });
      });
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
            const output = await initiateAuth(TestContext, {
              ClientId: userPoolClient.ClientId,
              AuthFlow: "USER_PASSWORD_AUTH",
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

          describe("when Post Authentication trigger is enabled", () => {
            it("does not invoke the trigger", async () => {
              mockTriggers.enabled.mockImplementation(
                (trigger) => trigger === "PostAuthentication"
              );

              await initiateAuth(TestContext, {
                ClientId: userPoolClient.ClientId,
                AuthFlow: "USER_PASSWORD_AUTH",
                AuthParameters: {
                  USERNAME: user.Username,
                  PASSWORD: user.Password,
                },
              });

              expect(mockTriggers.postAuthentication).not.toHaveBeenCalled();
            });
          });
        });

        describe("when user doesn't have MFA configured", () => {
          const user = TDB.user({ MFAOptions: undefined });

          beforeEach(() => {
            mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          });

          it("throws an exception", async () => {
            await expect(
              initiateAuth(TestContext, {
                ClientId: userPoolClient.ClientId,
                AuthFlow: "USER_PASSWORD_AUTH",
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
            const output = await initiateAuth(TestContext, {
              ClientId: userPoolClient.ClientId,
              ClientMetadata: {
                client: "metadata",
              },
              AuthFlow: "USER_PASSWORD_AUTH",
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

          describe("when Post Authentication trigger is enabled", () => {
            it("does not invoke the trigger", async () => {
              mockTriggers.enabled.mockImplementation(
                (trigger) => trigger === "PostAuthentication"
              );

              await initiateAuth(TestContext, {
                ClientId: userPoolClient.ClientId,
                AuthFlow: "USER_PASSWORD_AUTH",
                AuthParameters: {
                  USERNAME: user.Username,
                  PASSWORD: user.Password,
                },
              });

              expect(mockTriggers.postAuthentication).not.toHaveBeenCalled();
            });
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

            const output = await initiateAuth(TestContext, {
              ClientId: userPoolClient.ClientId,
              AuthFlow: "USER_PASSWORD_AUTH",
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
            expect(output.AuthenticationResult?.RefreshToken).toEqual(
              "refresh"
            );

            expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
              TestContext,
              user,
              userPoolClient,
              undefined,
              "Authentication"
            );
          });
        });
      });

      describe("when MFA is OFF", () => {
        const user = TDB.user();

        beforeEach(() => {
          mockUserPoolService.options.MfaConfiguration = "OFF";
          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
        });

        it("generates tokens", async () => {
          mockTokenGenerator.generate.mockResolvedValue({
            AccessToken: "access",
            IdToken: "id",
            RefreshToken: "refresh",
          });

          const output = await initiateAuth(TestContext, {
            ClientId: userPoolClient.ClientId,
            AuthFlow: "USER_PASSWORD_AUTH",
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
            userPoolClient,
            undefined,
            "Authentication"
          );
        });

        describe("when Post Authentication trigger is enabled", () => {
          it("invokes the trigger", async () => {
            mockTokenGenerator.generate.mockResolvedValue({
              AccessToken: "access",
              IdToken: "id",
              RefreshToken: "refresh",
            });

            mockTriggers.enabled.mockImplementation(
              (trigger) => trigger === "PostAuthentication"
            );

            await initiateAuth(TestContext, {
              ClientId: userPoolClient.ClientId,
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
              },
            });

            expect(mockTriggers.postAuthentication).toHaveBeenCalledWith(
              TestContext,
              {
                clientId: userPoolClient.ClientId,
                source: "PostAuthentication_Authentication",
                userAttributes: user.Attributes,
                username: user.Username,
                userPoolId: userPoolClient.UserPoolId,
              }
            );
          });
        });
      });
    });

    describe("when user status is FORCE_CHANGE_PASSWORD", () => {
      const user = TDB.user({
        UserStatus: "FORCE_CHANGE_PASSWORD",
      });

      beforeEach(() => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      });

      it("responds with a NEW_PASSWORD_REQUIRED challenge", async () => {
        const response = await initiateAuth(TestContext, {
          ClientId: userPoolClient.ClientId,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: user.Username,
            PASSWORD: "bad-password",
          },
        });

        expect(response).toEqual({
          ChallengeName: "NEW_PASSWORD_REQUIRED",
          ChallengeParameters: {
            USER_ID_FOR_SRP: user.Username,
            requiredAttributes: "[]",
            userAttributes: JSON.stringify(attributesToRecord(user.Attributes)),
          },
          Session: expect.stringMatching(UUID),
        });
      });

      describe("when Post Authentication trigger is enabled", () => {
        it("does not invoke the trigger", async () => {
          mockTriggers.enabled.mockImplementation(
            (trigger) => trigger === "PostAuthentication"
          );

          await initiateAuth(TestContext, {
            ClientId: userPoolClient.ClientId,
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
            },
          });

          expect(mockTriggers.postAuthentication).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe("REFRESH_TOKEN_AUTH auth flow", () => {
    it("returns new tokens", async () => {
      mockTokenGenerator.generate.mockResolvedValue({
        AccessToken: "access",
        IdToken: "id",
        RefreshToken: "refresh",
      });

      const existingUser = TDB.user({
        RefreshTokens: ["refresh token"],
      });

      mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);

      const response = await initiateAuth(TestContext, {
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: userPoolClient.ClientId,
        AuthParameters: {
          REFRESH_TOKEN: "refresh token",
        },
        ClientMetadata: {
          client: "metadata",
        },
      });

      expect(response.AuthenticationResult?.AccessToken).toEqual("access");
      expect(response.AuthenticationResult?.IdToken).toEqual("id");

      // does not return a refresh token as part of a refresh token flow
      expect(response.AuthenticationResult?.RefreshToken).not.toBeDefined();

      expect(mockTokenGenerator.generate).toHaveBeenCalledWith(
        TestContext,
        existingUser,
        userPoolClient,
        undefined,
        "RefreshTokens"
      );
    });
  });
});
