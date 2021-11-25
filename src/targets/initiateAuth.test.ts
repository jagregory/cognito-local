import jwt from "jsonwebtoken";
import { ClockFake } from "../__tests__/clockFake";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UUID } from "../__tests__/patterns";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
} from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import {
  CognitoClient,
  Messages,
  Triggers,
  MessageDelivery,
} from "../services";
import { User } from "../services/userPoolClient";
import { InitiateAuth, InitiateAuthTarget } from "./initiateAuth";

describe("InitiateAuth target", () => {
  let initiateAuth: InitiateAuthTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);

    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
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
      clock: new ClockFake(now),
      messageDelivery: mockMessageDelivery,
      messages: mockMessages,
      otp: mockOtp,
      triggers: mockTriggers,
    });
  });

  describe("USER_PASSWORD_AUTH auth flow", () => {
    it("throws if AuthParameters not provided", async () => {
      await expect(
        initiateAuth({
          ClientId: "clientId",
          AuthFlow: "USER_PASSWORD_AUTH",
        })
      ).rejects.toEqual(
        new InvalidParameterError("Missing required parameter authParameters")
      );
    });

    it("throws if password is incorrect", async () => {
      MockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [],
        UserStatus: "CONFIRMED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: now.getTime(),
      });

      await expect(
        initiateAuth({
          ClientId: "clientId",
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "0000-0000",
            PASSWORD: "bad-password",
          },
        })
      ).rejects.toBeInstanceOf(InvalidPasswordError);
    });

    it("throws when user requires reset", async () => {
      MockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [],
        UserStatus: "RESET_REQUIRED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: now.getTime(),
      });

      await expect(
        initiateAuth({
          ClientId: "clientId",
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: "0000-0000",
            PASSWORD: "bad-password",
          },
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
            UserLastModifiedDate: now.getTime(),
            UserCreateDate: now.getTime(),
            Enabled: true,
            Attributes: [],
          });
          MockUserPoolClient.getUserByUsername.mockResolvedValue(null);

          const output = await initiateAuth({
            ClientId: "clientId",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "0000-0000",
              PASSWORD: "hunter2",
            },
          });

          expect(output).toBeDefined();
          expect(output.AuthenticationResult?.AccessToken).toBeDefined();
        });
      });

      describe("when User Migration trigger is disabled", () => {
        it("throws", async () => {
          mockTriggers.enabled.mockReturnValue(false);
          MockUserPoolClient.getUserByUsername.mockResolvedValue(null);

          await expect(
            initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
            })
          ).rejects.toBeInstanceOf(NotAuthorizedError);
        });
      });
    });

    describe("when password matches", () => {
      describe("when MFA is ON", () => {
        beforeEach(() => {
          MockUserPoolClient.config.MfaConfiguration = "ON";
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
              UserCreateDate: now.getTime(),
              UserLastModifiedDate: now.getTime(),
              MFAOptions: [
                {
                  DeliveryMedium: "SMS",
                  AttributeName: "phone_number",
                },
              ],
            };
            MockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("sends MFA code to user", async () => {
            const output = await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
            });

            expect(output).toBeDefined();

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
            expect(MockUserPoolClient.saveUser).toHaveBeenCalledWith({
              ...user,
              MFACode: "1234",
            });
          });
        });

        describe("when user doesn't have MFA configured", () => {
          beforeEach(() => {
            MockUserPoolClient.getUserByUsername.mockResolvedValue({
              Attributes: [],
              UserStatus: "CONFIRMED",
              Password: "hunter2",
              Username: "0000-0000",
              Enabled: true,
              UserCreateDate: now.getTime(),
              UserLastModifiedDate: now.getTime(),
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
              })
            ).rejects.toBeInstanceOf(NotAuthorizedError);
          });
        });
      });

      describe("when MFA is OPTIONAL", () => {
        beforeEach(() => {
          MockUserPoolClient.config.MfaConfiguration = "OPTIONAL";
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
              UserCreateDate: now.getTime(),
              UserLastModifiedDate: now.getTime(),
              MFAOptions: [
                {
                  DeliveryMedium: "SMS",
                  AttributeName: "phone_number",
                },
              ],
            };
            MockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("sends MFA code to user", async () => {
            const output = await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
            });

            expect(output).toBeDefined();

            expect(mockMessages.authentication).toHaveBeenCalledWith(
              "clientId",
              "test",
              user,
              "1234"
            );
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
            expect(MockUserPoolClient.saveUser).toHaveBeenCalledWith({
              ...user,
              MFACode: "1234",
            });
          });
        });

        describe("when user doesn't have MFA configured", () => {
          beforeEach(() => {
            MockUserPoolClient.getUserByUsername.mockResolvedValue({
              Attributes: [
                { Name: "sub", Value: "0000-0000" },
                { Name: "email", Value: "example@example.com" },
              ],
              UserStatus: "CONFIRMED",
              Password: "hunter2",
              Username: "0000-0000",
              Enabled: true,
              UserCreateDate: now.getTime(),
              UserLastModifiedDate: now.getTime(),
            });
          });

          it("generates tokens", async () => {
            const output = await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: "0000-0000",
                PASSWORD: "hunter2",
              },
            });

            expect(output).toBeDefined();

            // access token
            expect(output.AuthenticationResult?.AccessToken).toBeDefined();
            const decodedAccessToken = jwt.decode(
              output.AuthenticationResult?.AccessToken ?? ""
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
                output.AuthenticationResult?.AccessToken ?? "",
                PublicKey.pem,
                {
                  algorithms: ["RS256"],
                }
              )
            ).toBeTruthy();

            // id token
            expect(output.AuthenticationResult?.IdToken).toBeDefined();
            const decodedIdToken = jwt.decode(
              output.AuthenticationResult?.IdToken ?? ""
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
              jwt.verify(
                output.AuthenticationResult?.IdToken ?? "",
                PublicKey.pem,
                {
                  algorithms: ["RS256"],
                }
              )
            ).toBeTruthy();
          });
        });
      });

      describe("when MFA is OFF", () => {
        beforeEach(() => {
          MockUserPoolClient.config.MfaConfiguration = "OFF";
        });

        it("generates tokens", async () => {
          MockUserPoolClient.getUserByUsername.mockResolvedValue({
            Attributes: [
              { Name: "sub", Value: "0000-0000" },
              { Name: "email", Value: "example@example.com" },
            ],
            UserStatus: "CONFIRMED",
            Password: "hunter2",
            Username: "0000-0000",
            Enabled: true,
            UserCreateDate: now.getTime(),
            UserLastModifiedDate: now.getTime(),
          });
          const output = await initiateAuth({
            ClientId: "clientId",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "0000-0000",
              PASSWORD: "hunter2",
            },
          });

          expect(output).toBeDefined();

          // access token
          expect(output.AuthenticationResult?.AccessToken).toBeDefined();
          const decodedAccessToken = jwt.decode(
            output.AuthenticationResult?.AccessToken ?? ""
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
              output.AuthenticationResult?.AccessToken ?? "",
              PublicKey.pem,
              {
                algorithms: ["RS256"],
              }
            )
          ).toBeTruthy();

          // id token
          expect(output.AuthenticationResult?.IdToken).toBeDefined();
          const decodedIdToken = jwt.decode(
            output.AuthenticationResult?.IdToken ?? ""
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
            jwt.verify(
              output.AuthenticationResult?.IdToken ?? "",
              PublicKey.pem,
              {
                algorithms: ["RS256"],
              }
            )
          ).toBeTruthy();
        });
      });
    });
  });
});
