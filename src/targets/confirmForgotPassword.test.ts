import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { CodeMismatchError, UserNotFoundError } from "../errors";
import { Triggers, UserPoolService } from "../services";
import {
  ConfirmForgotPassword,
  ConfirmForgotPasswordTarget,
} from "./confirmForgotPassword";
import * as TDB from "../__tests__/testDataBuilder";

const currentDate = new Date();

describe("ConfirmForgotPassword target", () => {
  let confirmForgotPassword: ConfirmForgotPasswordTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockTriggers: jest.Mocked<Triggers>;

  let clock: ClockFake;

  beforeEach(() => {
    clock = new ClockFake(currentDate);

    mockUserPoolService = newMockUserPoolService();
    mockTriggers = newMockTriggers();
    confirmForgotPassword = ConfirmForgotPassword({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
      triggers: mockTriggers,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

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

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

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

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      // advance the time so we can see the last modified timestamp change
      const newNow = clock.advanceBy(5000);

      await confirmForgotPassword({
        ClientId: "clientId",
        Username: user.Username,
        ConfirmationCode: "4567",
        Password: "newPassword",
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith({
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

        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

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

        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

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
