import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockMessages } from "../mocks/MockMessages";
import { MockTokenGenerator } from "../mocks/MockTokenGenerator";
import { MockTriggers } from "../mocks/MockTriggers";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { UUID } from "../models";
import { MockContext } from "../mocks/MockContext";

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
import { MockUser } from "../models/UserModel";

describe("InitiateAuth target", () => {
  let initiateAuth: InitiateAuthTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let mockTokenGenerator: jest.Mocked<TokenGenerator>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    mockMessages = MockMessages();
    mockOtp = jest.fn().mockReturnValue("1234");
    mockTriggers = MockTriggers();
    mockTokenGenerator = MockTokenGenerator();
    initiateAuth = InitiateAuth({
      cognito: MockCognitoService(mockUserPoolService),
      messages: mockMessages,
      otp: mockOtp,
      triggers: mockTriggers,
      tokenGenerator: mockTokenGenerator,
    });
  });

  describe("USER_PASSWORD_AUTH auth flow", () => {
    it("throws if AuthParameters not provided", async () => {
      await expect(
        initiateAuth(MockContext, {
          ClientId: "clientId",
          AuthFlow: "USER_PASSWORD_AUTH",
        })
      ).rejects.toEqual(
        new InvalidParameterError("Missing required parameter authParameters")
      );
    });

    it("throws if password is incorrect", async () => {
      const user = MockUser();

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await expect(
        initiateAuth(MockContext, {
          ClientId: "clientId",
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: user.Username,
            PASSWORD: "bad-password",
          },
        })
      ).rejects.toBeInstanceOf(InvalidPasswordError);
    });

    it("throws when user requires reset", async () => {
      const user = MockUser({
        UserStatus: "RESET_REQUIRED",
      });

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await expect(
        initiateAuth(MockContext, {
          ClientId: "clientId",
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

          const user = MockUser();

          mockTriggers.enabled.mockReturnValue(true);
          mockTriggers.userMigration.mockResolvedValue(user);
          mockUserPoolService.getUserByUsername.mockResolvedValue(null);

          const output = await initiateAuth(MockContext, {
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
            },
            ClientId: "clientId",
            ClientMetadata: {
              client: "metadata",
            },
          });

          expect(mockTriggers.userMigration).toHaveBeenCalledWith(MockContext, {
            clientId: "clientId",
            clientMetadata: undefined,
            password: user.Password,
            userAttributes: [],
            userPoolId: "test",
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
            initiateAuth(MockContext, {
              ClientId: "clientId",
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
          mockUserPoolService.config.MfaConfiguration = "ON";
        });

        describe("when user has SMS_MFA configured", () => {
          let user: User;

          beforeEach(() => {
            user = MockUser({
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
            const output = await initiateAuth(MockContext, {
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
              },
            });

            expect(output).toBeDefined();

            expect(mockMessages.deliver).toHaveBeenCalledWith(
              MockContext,
              "Authentication",
              "clientId",
              "test",
              user,
              "1234",
              undefined,
              {
                AttributeName: "phone_number",
                DeliveryMedium: "SMS",
                Destination: "0411000111",
              }
            );

            // also saves the code on the user for comparison later
            expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(
              MockContext,
              {
                ...user,
                MFACode: "1234",
              }
            );
          });

          describe("when Post Authentication trigger is enabled", () => {
            it("does not invoke the trigger", async () => {
              mockTriggers.enabled.mockImplementation(
                (trigger) => trigger === "PostAuthentication"
              );

              await initiateAuth(MockContext, {
                ClientId: "clientId",
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
          const user = MockUser({ MFAOptions: undefined });

          beforeEach(() => {
            mockUserPoolService.getUserByUsername.mockResolvedValue(user);
          });

          it("throws an exception", async () => {
            await expect(
              initiateAuth(MockContext, {
                ClientId: "clientId",
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
          mockUserPoolService.config.MfaConfiguration = "OPTIONAL";
        });

        describe("when user has SMS_MFA configured", () => {
          let user: User;

          beforeEach(() => {
            user = MockUser({
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
            const output = await initiateAuth(MockContext, {
              ClientId: "clientId",
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
              MockContext,
              "Authentication",
              "clientId",
              "test",
              user,
              "1234",
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
              MockContext,
              {
                ...user,
                MFACode: "1234",
              }
            );
          });

          describe("when Post Authentication trigger is enabled", () => {
            it("does not invoke the trigger", async () => {
              mockTriggers.enabled.mockImplementation(
                (trigger) => trigger === "PostAuthentication"
              );

              await initiateAuth(MockContext, {
                ClientId: "clientId",
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
          const user = MockUser({
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

            const output = await initiateAuth(MockContext, {
              ClientId: "clientId",
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
              MockContext,
              user,
              "clientId",
              "test",
              undefined,
              "Authentication"
            );
          });
        });
      });

      describe("when MFA is OFF", () => {
        const user = MockUser();

        beforeEach(() => {
          mockUserPoolService.config.MfaConfiguration = "OFF";
          mockUserPoolService.getUserByUsername.mockResolvedValue(user);
        });

        it("generates tokens", async () => {
          mockTokenGenerator.generate.mockResolvedValue({
            AccessToken: "access",
            IdToken: "id",
            RefreshToken: "refresh",
          });

          const output = await initiateAuth(MockContext, {
            ClientId: "clientId",
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
            MockContext,
            user,
            "clientId",
            "test",
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

            await initiateAuth(MockContext, {
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
              },
            });

            expect(mockTriggers.postAuthentication).toHaveBeenCalledWith(
              MockContext,
              {
                clientId: "clientId",
                source: "PostAuthentication_Authentication",
                userAttributes: user.Attributes,
                username: user.Username,
                userPoolId: "test",
              }
            );
          });
        });
      });
    });

    describe("when user status is FORCE_CHANGE_PASSWORD", () => {
      const user = MockUser({
        UserStatus: "FORCE_CHANGE_PASSWORD",
      });

      beforeEach(() => {
        mockUserPoolService.getUserByUsername.mockResolvedValue(user);
      });

      it("responds with a NEW_PASSWORD_REQUIRED challenge", async () => {
        const response = await initiateAuth(MockContext, {
          ClientId: "clientId",
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

          await initiateAuth(MockContext, {
            ClientId: "clientId",
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

      const existingUser = MockUser({
        RefreshTokens: ["refresh token"],
      });

      mockUserPoolService.getUserByRefreshToken.mockResolvedValue(existingUser);

      const response = await initiateAuth(MockContext, {
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: "clientId",
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
        MockContext,
        existingUser,
        "clientId",
        "test",
        undefined,
        "RefreshTokens"
      );
    });
  });
});
