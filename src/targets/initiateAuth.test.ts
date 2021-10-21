import { advanceTo } from "jest-date-mock";
import jwt from "jsonwebtoken";
import { UUID } from "../__tests__/patterns";
import {
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
} from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import {
  CognitoClient,
  UserPoolClient,
  Messages,
  Triggers,
  MessageDelivery,
} from "../services";
import { User } from "../services/userPoolClient";
import {
  InitiateAuth,
  InitiateAuthTarget,
  PasswordVerifierOutput,
  SmsMfaOutput,
} from "./initiateAuth";

describe("InitiateAuth target", () => {
  let initiateAuth: InitiateAuthTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockUserPoolClient = {
      config: {
        Id: "test",
      },
      createAppClient: jest.fn(),
      getUserByUsername: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(mockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(mockUserPoolClient),
    };
    mockMessageDelivery = {
      deliver: jest.fn(),
    };
    mockMessages = {
      authentication: jest.fn().mockResolvedValue({
        emailSubject: "Mock message",
      }),
      forgotPassword: jest.fn(),
      signUp: jest.fn(),
    };
    mockOtp = jest.fn().mockReturnValue("1234");
    mockTriggers = {
      enabled: jest.fn(),
      customMessage: jest.fn(),
      postConfirmation: jest.fn(),
      userMigration: jest.fn(),
    };

    initiateAuth = InitiateAuth({
      cognitoClient: mockCognitoClient,
      messageDelivery: mockMessageDelivery,
      messages: mockMessages,
      otp: mockOtp,
      triggers: mockTriggers,
    });
  });

  describe("USER_PASSWORD_AUTH auth flow", () => {
    it("throws if password is incorrect", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [],
        UserStatus: "CONFIRMED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: Math.floor(new Date().getTime() / 1000),
        UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
      });

      await expect(
        initiateAuth({
          ClientId: "clientId",
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "0000-0000",
            PASSWORD: "bad-password",
          },
          Session: "Session",
        })
      ).rejects.toBeInstanceOf(InvalidPasswordError);
    });

    it("throws when user requires reset", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [],
        UserStatus: "RESET_REQUIRED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: Math.floor(new Date().getTime() / 1000),
        UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
      });

      await expect(
        initiateAuth({
          ClientId: "clientId",
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "0000-0000",
            PASSWORD: "bad-password",
          },
          Session: "Session",
        })
      ).rejects.toBeInstanceOf(PasswordResetRequiredError);
    });

    describe("when user doesn't exist", () => {
      describe("when User Migration trigger is enabled", () => {
        it("invokes the User Migration trigger and continues", async () => {
          mockTriggers.enabled.mockReturnValue(true);
          mockTriggers.userMigration.mockResolvedValue({
            Username: "0000-000",
            UserStatus: "CONFIRMED",
            Password: "hunter2",
            UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
            UserCreateDate: Math.floor(new Date().getTime() / 1000),
            Enabled: true,
            Attributes: [],
          });
          mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

          const output = (await initiateAuth({
            ClientId: "clientId",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "0000-0000",
              PASSWORD: "hunter2",
            },
            Session: "Session",
          })) as PasswordVerifierOutput;

          expect(output).toBeDefined();
          expect(output.Session).toBe("Session");
          expect(output.AuthenticationResult.AccessToken).toBeDefined();
        });
      });

      describe("when User Migration trigger is disabled", () => {
        it("throws", async () => {
          mockTriggers.enabled.mockReturnValue(false);
          mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

          await expect(
            initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
              Session: "Session",
            })
          ).rejects.toBeInstanceOf(NotAuthorizedError);
        });
      });
    });

    describe("when password matches", () => {
      describe("when MFA is ON", () => {
        beforeEach(() => {
          mockUserPoolClient.config.MfaConfiguration = "ON";
        });

        describe("when user has SMS_MFA configured", () => {
          let user: User;

          beforeEach(() => {
            user = {
              Attributes: [
                {
                  Name: "phone_number",
                  Value: "0411000111",
                },
              ],
              UserStatus: "CONFIRMED",
              Password: "hunter2",
              Username: "0000-0000",
              Enabled: true,
              UserCreateDate: Math.floor(new Date().getTime() / 1000),
              UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
              MFAOptions: [
                {
                  DeliveryMedium: "SMS",
                  AttributeName: "phone_number",
                },
              ],
            };
            mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("sends MFA code to user", async () => {
            const output = (await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
              Session: "Session",
            })) as SmsMfaOutput;

            expect(output).toBeDefined();
            expect(output.Session).toBe("Session");

            expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
              user,
              {
                AttributeName: "phone_number",
                DeliveryMedium: "SMS",
                Destination: "0411000111",
              },
              { emailSubject: "Mock message" }
            );

            // also saves the code on the user for comparison later
            expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
              ...user,
              MFACode: "1234",
            });
          });
        });

        describe("when user doesn't have MFA configured", () => {
          beforeEach(() => {
            mockUserPoolClient.getUserByUsername.mockResolvedValue({
              Attributes: [],
              UserStatus: "CONFIRMED",
              Password: "hunter2",
              Username: "0000-0000",
              Enabled: true,
              UserCreateDate: Math.floor(new Date().getTime() / 1000),
              UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
            });
          });

          it("throws an exception", async () => {
            await expect(
              initiateAuth({
                ClientId: "clientId",
                AuthFlow: "USER_PASSWORD_AUTH",
                AuthParameters: {
                  USERNAME: "0000-0000",
                  PASSWORD: "hunter2",
                },
                Session: "Session",
              })
            ).rejects.toBeInstanceOf(NotAuthorizedError);
          });
        });
      });

      describe("when MFA is OPTIONAL", () => {
        beforeEach(() => {
          mockUserPoolClient.config.MfaConfiguration = "OPTIONAL";
        });

        describe("when user has SMS_MFA configured", () => {
          let user: User;

          beforeEach(() => {
            user = {
              Attributes: [
                {
                  Name: "phone_number",
                  Value: "0411000111",
                },
              ],
              UserStatus: "CONFIRMED",
              Password: "hunter2",
              Username: "0000-0000",
              Enabled: true,
              UserCreateDate: Math.floor(new Date().getTime() / 1000),
              UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
              MFAOptions: [
                {
                  DeliveryMedium: "SMS",
                  AttributeName: "phone_number",
                },
              ],
            };
            mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("sends MFA code to user", async () => {
            const output = (await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
              Session: "Session",
            })) as SmsMfaOutput;

            expect(output).toBeDefined();
            expect(output.Session).toBe("Session");

            expect(mockMessageDelivery.deliver).toHaveBeenCalledWith(
              user,
              {
                AttributeName: "phone_number",
                DeliveryMedium: "SMS",
                Destination: "0411000111",
              },
              { emailSubject: "Mock message" }
            );

            // also saves the code on the user for comparison later
            expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
              ...user,
              MFACode: "1234",
            });
          });
        });

        describe("when user doesn't have MFA configured", () => {
          beforeEach(() => {
            mockUserPoolClient.getUserByUsername.mockResolvedValue({
              Attributes: [
                { Name: "sub", Value: "0000-0000" },
                { Name: "email", Value: "example@example.com" },
              ],
              UserStatus: "CONFIRMED",
              Password: "hunter2",
              Username: "0000-0000",
              Enabled: true,
              UserCreateDate: Math.floor(new Date().getTime() / 1000),
              UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
            });
          });

          it("generates tokens", async () => {
            const output = (await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
              Session: "Session",
            })) as PasswordVerifierOutput;

            expect(output).toBeDefined();
            expect(output.Session).toBe("Session");

            // access token
            expect(output.AuthenticationResult.AccessToken).toBeDefined();
            const decodedAccessToken = jwt.decode(
              output.AuthenticationResult.AccessToken
            );
            expect(decodedAccessToken).toMatchObject({
              client_id: "clientId",
              iss: "http://localhost:9229/test",
              sub: "0000-0000",
              token_use: "access",
              username: "0000-0000",
              event_id: expect.stringMatching(UUID),
              scope: "aws.cognito.signin.user.admin", // TODO: scopes
              auth_time: Math.floor(now.getTime() / 1000),
              jti: expect.stringMatching(UUID),
            });
            expect(
              jwt.verify(
                output.AuthenticationResult.AccessToken,
                PublicKey.pem,
                {
                  algorithms: ["RS256"],
                }
              )
            ).toBeTruthy();

            // id token
            expect(output.AuthenticationResult.IdToken).toBeDefined();
            const decodedIdToken = jwt.decode(
              output.AuthenticationResult.IdToken
            );
            expect(decodedIdToken).toMatchObject({
              aud: "clientId",
              iss: "http://localhost:9229/test",
              sub: "0000-0000",
              token_use: "id",
              "cognito:username": "0000-0000",
              email_verified: true,
              event_id: expect.stringMatching(UUID),
              auth_time: Math.floor(now.getTime() / 1000),
              email: "example@example.com",
            });
            expect(
              jwt.verify(output.AuthenticationResult.IdToken, PublicKey.pem, {
                algorithms: ["RS256"],
              })
            ).toBeTruthy();
          });
        });
      });

      describe("when MFA is OFF", () => {
        beforeEach(() => {
          mockUserPoolClient.config.MfaConfiguration = "OFF";
        });

        it("generates tokens", async () => {
          mockUserPoolClient.getUserByUsername.mockResolvedValue({
            Attributes: [
              { Name: "sub", Value: "0000-0000" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserStatus: "CONFIRMED",
            Password: "hunter2",
            Username: "0000-0000",
            Enabled: true,
            UserCreateDate: Math.floor(new Date().getTime() / 1000),
            UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
          });
          const output = (await initiateAuth({
            ClientId: "clientId",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "0000-0000",
              PASSWORD: "hunter2",
            },
            Session: "Session",
          })) as PasswordVerifierOutput;

          expect(output).toBeDefined();
          expect(output.Session).toBe("Session");

          // access token
          expect(output.AuthenticationResult.AccessToken).toBeDefined();
          const decodedAccessToken = jwt.decode(
            output.AuthenticationResult.AccessToken
          );
          expect(decodedAccessToken).toMatchObject({
            client_id: "clientId",
            iss: "http://localhost:9229/test",
            sub: "0000-0000",
            token_use: "access",
            username: "0000-0000",
            event_id: expect.stringMatching(UUID),
            scope: "aws.cognito.signin.user.admin", // TODO: scopes
            auth_time: Math.floor(now.getTime() / 1000),
            jti: expect.stringMatching(UUID),
          });
          expect(
            jwt.verify(output.AuthenticationResult.AccessToken, PublicKey.pem, {
              algorithms: ["RS256"],
            })
          ).toBeTruthy();

          // id token
          expect(output.AuthenticationResult.IdToken).toBeDefined();
          const decodedIdToken = jwt.decode(
            output.AuthenticationResult.IdToken
          );
          expect(decodedIdToken).toMatchObject({
            aud: "clientId",
            iss: "http://localhost:9229/test",
            sub: "0000-0000",
            token_use: "id",
            "cognito:username": "0000-0000",
            email_verified: true,
            event_id: expect.stringMatching(UUID),
            auth_time: Math.floor(now.getTime() / 1000),
            email: "example@example.com",
          });
          expect(
            jwt.verify(output.AuthenticationResult.IdToken, PublicKey.pem, {
              algorithms: ["RS256"],
            })
          ).toBeTruthy();
        });
      });
    });
  });
});
