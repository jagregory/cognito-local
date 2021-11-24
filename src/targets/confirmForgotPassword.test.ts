import { ClockFake } from "../__tests__/clockFake";
import { CodeMismatchError, UserNotFoundError } from "../errors";
import { CognitoClient, UserPoolClient, Triggers } from "../services";
import {
  ConfirmForgotPassword,
  ConfirmForgotPasswordTarget,
} from "./confirmForgotPassword";

describe("ConfirmForgotPassword target", () => {
  let confirmForgotPassword: ConfirmForgotPasswordTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockTriggers: jest.Mocked<Triggers>;
  const currentDate = new Date(2020, 1, 2, 3, 4, 5);

  let clock: ClockFake;

  beforeEach(() => {
    clock = new ClockFake(currentDate);

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

    confirmForgotPassword = ConfirmForgotPassword({
      clock,
      cognitoClient: mockCognitoClient,
      triggers: mockTriggers,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      confirmForgotPassword({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "1234",
        Password: "newPassword",
      })
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("throws if confirmation code doesn't match stored value", async () => {
    mockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      ConfirmationCode: "4567",
      Enabled: true,
      Password: "pwd",
      UserCreateDate: currentDate.getTime(),
      UserLastModifiedDate: currentDate.getTime(),
      UserStatus: "UNCONFIRMED",
      Username: "0000-0000",
    });

    await expect(
      confirmForgotPassword({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "1234",
        Password: "newPassword",
      })
    ).rejects.toBeInstanceOf(CodeMismatchError);
  });

  describe("when code matches", () => {
    it("updates the user's password", async () => {
      mockUserPoolClient.getUserByUsername.mockResolvedValue({
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        ConfirmationCode: "4567",
        Enabled: true,
        Password: "pwd",
        UserCreateDate: currentDate.getTime(),
        UserLastModifiedDate: currentDate.getTime(),
        UserStatus: "UNCONFIRMED",
        Username: "0000-0000",
      });

      // advance the time so we can see the last modified timestamp change
      const newNow = clock.advanceBy(5000);

      await confirmForgotPassword({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "4567",
        Password: "newPassword",
      });

      expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        ConfirmationCode: undefined,
        Enabled: true,
        Password: "newPassword",
        UserCreateDate: currentDate.getTime(),
        UserLastModifiedDate: newNow.getTime(),
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
          UserCreateDate: currentDate.getTime(),
          UserLastModifiedDate: currentDate.getTime(),
          UserStatus: "UNCONFIRMED",
          Username: "0000-0000",
        });

        await confirmForgotPassword({
          ClientId: "clientId",
          Username: "janice",
          ConfirmationCode: "4567",
          Password: "newPassword",
        });

        expect(mockTriggers.postConfirmation).toHaveBeenCalledWith({
          clientId: "clientId",
          source: "PostConfirmation_ConfirmForgotPassword",
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
          UserCreateDate: currentDate.getTime(),
          UserLastModifiedDate: currentDate.getTime(),
          UserStatus: "UNCONFIRMED",
          Username: "0000-0000",
        });

        await confirmForgotPassword({
          ClientId: "clientId",
          Username: "janice",
          ConfirmationCode: "4567",
          Password: "newPassword",
        });

        expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
      });
    });
  });
});
