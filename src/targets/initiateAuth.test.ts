import jwt from "jsonwebtoken";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockMessageDelivery } from "../__tests__/mockMessageDelivery";
import { newMockMessages } from "../__tests__/mockMessages";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UUID } from "../__tests__/patterns";
import * as TDB from "../__tests__/testDataBuilder";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
} from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import {
  MessageDelivery,
  Messages,
  Triggers,
  UserPoolClient,
} from "../services";
import {
  attributesToRecord,
  attributeValue,
  User,
} from "../services/userPoolClient";
import { InitiateAuth, InitiateAuthTarget } from "./initiateAuth";

describe("InitiateAuth target", () => {
  let initiateAuth: InitiateAuthTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockMessageDelivery: jest.Mocked<MessageDelivery>;
  let mockMessages: jest.Mocked<Messages>;
  let mockOtp: jest.MockedFunction<() => string>;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);

    mockUserPoolClient = newMockUserPoolClient();
    mockMessageDelivery = newMockMessageDelivery();
    mockMessages = newMockMessages();
    mockMessages.authentication.mockResolvedValue({
      emailSubject: "Mock message",
    });
    mockOtp = jest.fn().mockReturnValue("1234");
    mockTriggers = newMockTriggers();
    initiateAuth = InitiateAuth({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
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
      const user = TDB.user();

      mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      await expect(
        initiateAuth({
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
      const user = TDB.user({
        UserStatus: "RESET_REQUIRED",
      });

      mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      await expect(
        initiateAuth({
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
          const user = TDB.user();

          mockTriggers.enabled.mockReturnValue(true);
          mockTriggers.userMigration.mockResolvedValue(user);
          mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

          const output = await initiateAuth({
            ClientId: "clientId",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
            },
          });

          expect(output).toBeDefined();
          expect(output.AuthenticationResult?.AccessToken).toBeDefined();
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
          mockUserPoolClient.config.MfaConfiguration = "ON";
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
            mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("sends MFA code to user", async () => {
            const output = await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
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
            expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
              ...user,
              MFACode: "1234",
            });
          });

          describe("when Post Authentication trigger is enabled", () => {
            it("does not invoke the trigger", async () => {
              mockTriggers.enabled.mockImplementation(
                (trigger) => trigger === "PostAuthentication"
              );

              await initiateAuth({
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
          const user = TDB.user({ MFAOptions: undefined });

          beforeEach(() => {
            mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("throws an exception", async () => {
            await expect(
              initiateAuth({
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
          mockUserPoolClient.config.MfaConfiguration = "OPTIONAL";
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
            mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("sends MFA code to user", async () => {
            const output = await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
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
            expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
              ...user,
              MFACode: "1234",
            });
          });

          describe("when Post Authentication trigger is enabled", () => {
            it("does not invoke the trigger", async () => {
              mockTriggers.enabled.mockImplementation(
                (trigger) => trigger === "PostAuthentication"
              );

              await initiateAuth({
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
          const user = TDB.user({
            MFAOptions: undefined,
          });

          beforeEach(() => {
            mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
          });

          it("generates tokens", async () => {
            const output = await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
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
              sub: attributeValue("sub", user.Attributes),
              token_use: "access",
              username: user.Username,
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
              sub: attributeValue("sub", user.Attributes),
              token_use: "id",
              "cognito:username": user.Username,
              email_verified: true,
              event_id: expect.stringMatching(UUID),
              auth_time: Math.floor(now.getTime() / 1000),
              email: attributeValue("email", user.Attributes),
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
        const user = TDB.user();

        beforeEach(() => {
          mockUserPoolClient.config.MfaConfiguration = "OFF";
          mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
        });

        it("generates tokens", async () => {
          const output = await initiateAuth({
            ClientId: "clientId",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: user.Username,
              PASSWORD: user.Password,
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
            sub: attributeValue("sub", user.Attributes),
            token_use: "access",
            username: user.Username,
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
            sub: attributeValue("sub", user.Attributes),
            token_use: "id",
            "cognito:username": user.Username,
            email_verified: true,
            event_id: expect.stringMatching(UUID),
            auth_time: Math.floor(now.getTime() / 1000),
            email: attributeValue("email", user.Attributes),
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

        describe("when Post Authentication trigger is enabled", () => {
          it("invokes the trigger", async () => {
            mockTriggers.enabled.mockImplementation(
              (trigger) => trigger === "PostAuthentication"
            );

            await initiateAuth({
              ClientId: "clientId",
              AuthFlow: "USER_PASSWORD_AUTH",
              AuthParameters: {
                USERNAME: user.Username,
                PASSWORD: user.Password,
              },
            });

            expect(mockTriggers.postAuthentication).toHaveBeenCalledWith({
              clientId: "clientId",
              source: "PostAuthentication_Authentication",
              userAttributes: user.Attributes,
              username: user.Username,
              userPoolId: "test",
            });
          });
        });
      });
    });

    describe("when user status is FORCE_CHANGE_PASSWORD", () => {
      const user = TDB.user({
        UserStatus: "FORCE_CHANGE_PASSWORD",
      });

      beforeEach(() => {
        mockUserPoolClient.getUserByUsername.mockResolvedValue(user);
      });

      it("responds with a NEW_PASSWORD_REQUIRED challenge", async () => {
        const response = await initiateAuth({
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

          await initiateAuth({
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
});
