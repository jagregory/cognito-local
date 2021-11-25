import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { CodeMismatchError, UserNotFoundError } from "../errors";
import { Triggers, UserPoolClient } from "../services";
import {
  ConfirmForgotPassword,
  ConfirmForgotPasswordTarget,
} from "./confirmForgotPassword";
import * as TDB from "../__tests__/testDataBuilder";

const currentDate = new Date();

describe("ConfirmForgotPassword target", () => {
  let confirmForgotPassword: ConfirmForgotPasswordTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let mockTriggers: jest.Mocked<Triggers>;

  let clock: ClockFake;

  beforeEach(() => {
    clock = new ClockFake(currentDate);

    mockUserPoolClient = newMockUserPoolClient();
    mockTriggers = newMockTriggers();
    confirmForgotPassword = ConfirmForgotPassword({
      clock,
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
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
    const user = TDB.user({
      ConfirmationCode: "4567",
      UserStatus: "UNCONFIRMED",
    });

    mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

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
      const user = TDB.user({
        ConfirmationCode: "4567",
        UserStatus: "UNCONFIRMED",
      });

      mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

      // advance the time so we can see the last modified timestamp change
      const newNow = clock.advanceBy(5000);

      await confirmForgotPassword({
        ClientId: "clientId",
        Username: user.Username,
        ConfirmationCode: "4567",
        Password: "newPassword",
      });

      expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
        ...user,
        ConfirmationCode: undefined,
        Password: "newPassword",
        UserLastModifiedDate: newNow.getTime(),
        UserStatus: "CONFIRMED",
      });
    });

    describe("when PostConfirmation trigger configured", () => {
      it("invokes the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(true);

        const user = TDB.user({
          ConfirmationCode: "4567",
          UserStatus: "UNCONFIRMED",
        });

        mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

        await confirmForgotPassword({
          ClientId: "clientId",
          Username: user.Username,
          ConfirmationCode: "4567",
          Password: "newPassword",
        });

        expect(mockTriggers.postConfirmation).toHaveBeenCalledWith({
          clientId: "clientId",
          source: "PostConfirmation_ConfirmForgotPassword",
          userAttributes: user.Attributes,
          userPoolId: "test",
          username: user.Username,
        });
      });
    });

    describe("when PostConfirmation trigger not configured", () => {
      it("doesn't invoke the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        const user = TDB.user({
          ConfirmationCode: "4567",
          UserStatus: "UNCONFIRMED",
        });

        mockUserPoolClient.getUserByUsername.mockResolvedValue(user);

        await confirmForgotPassword({
          ClientId: "clientId",
          Username: user.Username,
          ConfirmationCode: "4567",
          Password: "newPassword",
        });

        expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
      });
    });
  });
});
