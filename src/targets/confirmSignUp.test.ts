import { ClockFake } from "../__tests__/clockFake";
import { CodeMismatchError, NotAuthorizedError } from "../errors";
import { CognitoClient, Triggers, UserPoolClient } from "../services";
import { ConfirmSignUp, ConfirmSignUpTarget } from "./confirmSignUp";

describe("ConfirmSignUp target", () => {
  let confirmSignUp: ConfirmSignUpTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockTriggers: jest.Mocked<Triggers>;
  let clock: ClockFake;

  const originalDate = new Date(2020, 1, 2, 3, 4, 5);

  beforeEach(() => {
    clock = new ClockFake(originalDate);

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
    mockTriggers = {
      enabled: jest.fn(),
      customMessage: jest.fn(),
      postConfirmation: jest.fn(),
      userMigration: jest.fn(),
    };

    confirmSignUp = ConfirmSignUp({
      cognitoClient: mockCognitoClient,
      clock,
      triggers: mockTriggers,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      confirmSignUp({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "1234",
        ForceAliasCreation: false,
      })
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("throws if confirmation code doesn't match stored value", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      ConfirmationCode: "4567",
      Enabled: true,
      Password: "pwd",
      UserCreateDate: Math.floor(originalDate.getTime() / 1000),
      UserLastModifiedDate: Math.floor(originalDate.getTime() / 1000),
      UserStatus: "UNCONFIRMED",
      Username: "0000-0000",
    });

    await expect(
      confirmSignUp({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "1234",
        ForceAliasCreation: false,
      })
    ).rejects.toBeInstanceOf(CodeMismatchError);
  });

  describe("when code matches", () => {
    it("updates the user's confirmed status", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        ConfirmationCode: "4567",
        Enabled: true,
        Password: "pwd",
        UserCreateDate: Math.floor(originalDate.getTime() / 1000),
        UserLastModifiedDate: Math.floor(originalDate.getTime() / 1000),
        UserStatus: "UNCONFIRMED",
        Username: "0000-0000",
      });

      // advance the time so we can see the last modified timestamp change
      const newNow = clock.advanceBy(5000);

      await confirmSignUp({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "4567",
        ForceAliasCreation: false,
      });

      expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        ConfirmationCode: undefined,
        Enabled: true,
        Password: "pwd",
        UserCreateDate: Math.floor(originalDate.getTime() / 1000),
        UserLastModifiedDate: Math.floor(newNow.getTime() / 1000),
        UserStatus: "CONFIRMED",
        Username: "0000-0000",
      });
    });

    describe("when PostConfirmation trigger configured", () => {
      it("invokes the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(true);

        mockUserPoolClient.getUserByUsername.mockResolvedValue({
          Attributes: [{ Name: "email", Value: "example@example.com" }],
          ConfirmationCode: "4567",
          Enabled: true,
          Password: "pwd",
          UserCreateDate: Math.floor(originalDate.getTime() / 1000),
          UserLastModifiedDate: Math.floor(originalDate.getTime() / 1000),
          UserStatus: "UNCONFIRMED",
          Username: "0000-0000",
        });

        await confirmSignUp({
          ClientId: "clientId",
          Username: "janice",
          ConfirmationCode: "4567",
          ForceAliasCreation: false,
        });

        expect(mockTriggers.postConfirmation).toHaveBeenCalledWith({
          clientId: "clientId",
          source: "PostConfirmation_ConfirmSignUp",
          userAttributes: [
            {
              Name: "email",
              Value: "example@example.com",
            },
          ],
          userPoolId: "test",
          username: "0000-0000",
        });
      });
    });

    describe("when PostConfirmation trigger not configured", () => {
      it("doesn't invoke the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        mockUserPoolClient.getUserByUsername.mockResolvedValue({
          Attributes: [{ Name: "email", Value: "example@example.com" }],
          ConfirmationCode: "4567",
          Enabled: true,
          Password: "pwd",
          UserCreateDate: Math.floor(originalDate.getTime() / 1000),
          UserLastModifiedDate: Math.floor(originalDate.getTime() / 1000),
          UserStatus: "UNCONFIRMED",
          Username: "0000-0000",
        });

        await confirmSignUp({
          ClientId: "clientId",
          Username: "janice",
          ConfirmationCode: "4567",
          ForceAliasCreation: false,
        });

        expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
      });
    });
  });
});
