import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import * as TDB from "../__tests__/testDataBuilder";
import { CodeMismatchError, NotAuthorizedError } from "../errors";
import { Triggers, UserPoolService } from "../services";
import { ConfirmSignUp, ConfirmSignUpTarget } from "./confirmSignUp";

const originalDate = new Date();

describe("ConfirmSignUp target", () => {
  let confirmSignUp: ConfirmSignUpTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let mockTriggers: jest.Mocked<Triggers>;
  let clock: ClockFake;

  beforeEach(() => {
    clock = new ClockFake(originalDate);

    mockUserPoolService = newMockUserPoolService();
    mockTriggers = newMockTriggers();
    confirmSignUp = ConfirmSignUp({
      cognito: newMockCognitoService(mockUserPoolService),
      clock,
      triggers: mockTriggers,
    });
  });

  it("throws if user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

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
    const user = TDB.user({
      ConfirmationCode: "4567",
      UserStatus: "UNCONFIRMED",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      confirmSignUp({
        ClientId: "clientId",
        Username: user.Username,
        ConfirmationCode: "1234",
      })
    ).rejects.toBeInstanceOf(CodeMismatchError);
  });

  describe("when code matches", () => {
    it("updates the user's confirmed status", async () => {
      const user = TDB.user({
        ConfirmationCode: "4567",
        UserStatus: "UNCONFIRMED",
      });

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      // advance the time so we can see the last modified timestamp change
      const newNow = clock.advanceBy(5000);

      await confirmSignUp({
        ClientId: "clientId",
        Username: user.Username,
        ConfirmationCode: "4567",
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith({
        ...user,
        ConfirmationCode: undefined,
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

        await confirmSignUp({
          ClientId: "clientId",
          Username: "janice",
          ConfirmationCode: "4567",
          ForceAliasCreation: false,
        });

        expect(mockTriggers.postConfirmation).toHaveBeenCalledWith({
          clientId: "clientId",
          source: "PostConfirmation_ConfirmSignUp",
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

        await confirmSignUp({
          ClientId: "clientId",
          Username: user.Username,
          ConfirmationCode: "4567",
        });

        expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
      });
    });
  });
});
