import { advanceBy, advanceTo } from "jest-date-mock";
import {
  CodeMismatchError,
  ResourceNotFoundError,
  UserNotFoundError,
} from "../errors";
import { UserPool } from "../services";
import { Triggers } from "../services/triggers";
import {
  ConfirmForgotPassword,
  ConfirmForgotPasswordTarget,
} from "./confirmForgotPassword";

describe("ConfirmForgotPassword target", () => {
  let confirmForgotPassword: ConfirmForgotPasswordTarget;
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
      postConfirmation: jest.fn(),
      userMigration: jest.fn(),
    };

    confirmForgotPassword = ConfirmForgotPassword({
      userPool: mockDataStore,
      codeDelivery: mockCodeDelivery,
      triggers: mockTriggers,
    });
  });

  it("throws if can't find user pool by client id", async () => {
    mockDataStore.getUserPoolIdForClientId.mockResolvedValue(null);

    await expect(
      confirmForgotPassword({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "1234",
        Password: "newPassword",
      })
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("throws if user doesn't exist", async () => {
    mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
    mockDataStore.getUserByUsername.mockResolvedValue(null);

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
    mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
    mockDataStore.getUserByUsername.mockResolvedValue({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      ConfirmationCode: "4567",
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
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
      mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
      mockDataStore.getUserByUsername.mockResolvedValue({
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        ConfirmationCode: "4567",
        Enabled: true,
        Password: "pwd",
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: now.getTime(),
        UserStatus: "UNCONFIRMED",
        Username: "0000-0000",
      });

      // advance the time so we can see the last modified timestamp change
      advanceBy(5000);
      const newNow = new Date();

      await confirmForgotPassword({
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "4567",
        Password: "newPassword",
      });

      expect(mockDataStore.saveUser).toHaveBeenCalledWith({
        Attributes: [{ Name: "email", Value: "example@example.com" }],
        ConfirmationCode: undefined,
        Enabled: true,
        Password: "newPassword",
        UserCreateDate: now.getTime(),
        UserLastModifiedDate: newNow.getTime(),
        UserStatus: "CONFIRMED",
        Username: "0000-0000",
      });
    });

    describe("when PostConfirmation trigger configured", () => {
      it("invokes the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(true);

        mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
        mockDataStore.getUserByUsername.mockResolvedValue({
          Attributes: [{ Name: "email", Value: "example@example.com" }],
          ConfirmationCode: "4567",
          Enabled: true,
          Password: "pwd",
          UserCreateDate: now.getTime(),
          UserLastModifiedDate: now.getTime(),
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
          userPoolId: "userPoolId",
          username: "0000-0000",
        });
      });
    });

    describe("when PostConfirmation trigger not configured", () => {
      it("doesn't invoke the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        mockDataStore.getUserPoolIdForClientId.mockResolvedValue("userPoolId");
        mockDataStore.getUserByUsername.mockResolvedValue({
          Attributes: [{ Name: "email", Value: "example@example.com" }],
          ConfirmationCode: "4567",
          Enabled: true,
          Password: "pwd",
          UserCreateDate: now.getTime(),
          UserLastModifiedDate: now.getTime(),
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
