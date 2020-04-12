import { advanceTo } from "jest-date-mock";
import * as uuid from "uuid";
import {
  InvalidPasswordError,
  NotAuthorizedError,
  PasswordResetRequiredError,
  ResourceNotFoundError,
} from "../errors";
import { UserPool } from "../services";
import { Triggers } from "../services/triggers";
import { InitiateAuth, InitiateAuthTarget } from "./initiateAuth";
import jwt from "jsonwebtoken";
import PublicKey from "../keys/cognitoLocal.public.json";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("InitiateAuth target", () => {
  let initiateAuth: InitiateAuthTarget;
  let mockDataStore: jest.Mocked<UserPool>;
  let mockCodeDelivery: jest.Mock;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockDataStore = {
      getUserByUsername: jest.fn(),
      getUserPoolIdForClientId: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCodeDelivery = jest.fn();
    mockTriggers = {
      enabled: jest.fn(),
      userMigration: jest.fn(),
    };

    initiateAuth = InitiateAuth({
      userPool: mockDataStore,
      codeDelivery: mockCodeDelivery,
      triggers: mockTriggers,
    });
  });

  it("throws if can't find user pool by client id", async () => {
    mockDataStore.getUserPoolIdForClientId.mockResolvedValue(null);

    await expect(
      initiateAuth({
        ClientId: "clientId",
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: "0000-0000",
          PASSWORD: "hunter2",
        },
      })
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  describe("USER_PASSWORD_AUTH auth flow", () => {
    it("throws if password is incorrect", async () => {
      mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
      mockDataStore.getUserByUsername.mockResolvedValue({
        Attributes: [],
        UserStatus: "CONFIRMED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
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
      mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
      mockDataStore.getUserByUsername.mockResolvedValue({
        Attributes: [],
        UserStatus: "RESET_REQUIRED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
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
            UserLastModifiedDate: new Date().getTime(),
            UserCreateDate: new Date().getTime(),
            Enabled: true,
            Attributes: [],
          });
          mockDataStore.getUserPoolIdForClientId.mockResolvedValue(
            "userPoolId"
          );
          mockDataStore.getUserByUsername.mockResolvedValue(null);

          const output = await initiateAuth({
            ClientId: "clientId",
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
              USERNAME: "0000-0000",
              PASSWORD: "hunter2",
            },
          });

          expect(output).toBeDefined();
          expect(output.AuthenticationResult.AccessToken).toBeDefined();
        });
      });

      describe("when User Migration trigger is disabled", () => {
        it("throws", async () => {
          mockTriggers.enabled.mockReturnValue(false);
          mockDataStore.getUserPoolIdForClientId.mockResolvedValue(
            "userPoolId"
          );
          mockDataStore.getUserByUsername.mockResolvedValue(null);

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
      it("generates an access token", async () => {
        mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
        mockDataStore.getUserByUsername.mockResolvedValue({
          Attributes: [],
          UserStatus: "CONFIRMED",
          Password: "hunter2",
          Username: "0000-0000",
          Enabled: true,
          UserCreateDate: new Date().getTime(),
          UserLastModifiedDate: new Date().getTime(),
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
        expect(output.AuthenticationResult.AccessToken).toBeDefined();

        const decodedAccessToken = jwt.decode(
          output.AuthenticationResult.AccessToken!
        );

        expect(decodedAccessToken).toMatchObject({
          client_id: "clientId",
          iss: "http://localhost:9229/userPoolId",
          sub: "0000-0000",
          token_use: "access",
          username: "0000-0000",
          event_id: expect.stringMatching(UUID),
          scope: "aws.cognito.signin.user.admin", // TODO: scopes
          auth_time: now.getTime(),
          jti: expect.stringMatching(UUID),
        });
      });

      it("generates an access token that's verifiable with our public key", async () => {
        mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
        mockDataStore.getUserByUsername.mockResolvedValue({
          Attributes: [],
          UserStatus: "CONFIRMED",
          Password: "hunter2",
          Username: "0000-0000",
          Enabled: true,
          UserCreateDate: new Date().getTime(),
          UserLastModifiedDate: new Date().getTime(),
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
        expect(output.AuthenticationResult.AccessToken).toBeDefined();

        expect(
          jwt.verify(output.AuthenticationResult.AccessToken!, PublicKey.pem, {
            algorithms: ["RS256"],
          })
        ).toBeTruthy();
      });

      it("generates an id token", async () => {
        mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
        mockDataStore.getUserByUsername.mockResolvedValue({
          Attributes: [{ Name: "email", Value: "example@example.com" }],
          UserStatus: "CONFIRMED",
          Password: "hunter2",
          Username: "0000-0000",
          Enabled: true,
          UserCreateDate: new Date().getTime(),
          UserLastModifiedDate: new Date().getTime(),
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
        expect(output.AuthenticationResult.IdToken).toBeDefined();

        const decodedIdToken = jwt.decode(output.AuthenticationResult.IdToken!);

        expect(decodedIdToken).toMatchObject({
          aud: "clientId",
          iss: "http://localhost:9229/userPoolId",
          sub: "0000-0000",
          token_use: "id",
          "cognito:username": "0000-0000",
          email_verified: true,
          event_id: expect.stringMatching(UUID),
          auth_time: now.getTime(),
          email: "example@example.com",
        });
      });

      it("generates an id token verifiable with our public key", async () => {
        mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
        mockDataStore.getUserByUsername.mockResolvedValue({
          Attributes: [{ Name: "email", Value: "example@example.com" }],
          UserStatus: "CONFIRMED",
          Password: "hunter2",
          Username: "0000-0000",
          Enabled: true,
          UserCreateDate: new Date().getTime(),
          UserLastModifiedDate: new Date().getTime(),
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
        expect(output.AuthenticationResult.IdToken).toBeDefined();

        expect(
          jwt.verify(output.AuthenticationResult.IdToken!, PublicKey.pem, {
            algorithms: ["RS256"],
          })
        ).toBeTruthy();
      });

      it.todo("generates a refresh token");
    });
  });
});
