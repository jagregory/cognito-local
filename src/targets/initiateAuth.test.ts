import { InvalidPasswordError, NotAuthorizedError } from "../errors";
import { CodeDelivery, UserPool } from "../services";
import { InitiateAuth, InitiateAuthTarget } from "./initiateAuth";
import jwt from "jsonwebtoken";

describe("InitiateAuth target", () => {
  let initiateAuth: InitiateAuthTarget;
  let mockDataStore: jest.Mocked<UserPool>;
  let mockCodeDelivery: jest.Mock;

  beforeEach(() => {
    mockDataStore = {
      getUserByUsername: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCodeDelivery = jest.fn();

    initiateAuth = InitiateAuth({
      storage: mockDataStore as UserPool,
      codeDelivery: mockCodeDelivery as CodeDelivery,
    });
  });

  describe("USER_PASSWORD_AUTH auth flow", () => {
    it("throws if user doesn't exist", async () => {
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

    it("throws if password is incorrect", async () => {
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

    describe("when password matches", () => {
      it("generates an access token", async () => {
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
          iss: "http://localhost:9229/user-pool-id",
          sub: "0000-0000",
          token_use: "access",
          username: "0000-0000",
        });
      });

      it("generates an id token", async () => {
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
        expect(output.AuthenticationResult.IdToken).toBeDefined();

        const decodedIdToken = jwt.decode(output.AuthenticationResult.IdToken!);

        expect(decodedIdToken).toMatchObject({
          aud: "clientId",
          iss: "http://localhost:9229/user-pool-id",
          sub: "0000-0000",
          token_use: "id",
          "cognito:username": "0000-0000",
        });
      });

      it.todo("generates a refresh token");
    });
  });
});
