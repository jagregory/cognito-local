import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { CodeMismatchError, UserNotFoundError } from "../errors";
import type { Triggers, UserPoolService } from "../services";
import { attribute, attributesAppend } from "../services/userPoolService";
import {
  ConfirmForgotPassword,
  type ConfirmForgotPasswordTarget,
} from "./confirmForgotPassword";

const currentDate = new Date();

describe("ConfirmForgotPassword target", () => {
  let confirmForgotPassword: ConfirmForgotPasswordTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockTriggers: MockedObject<Triggers>;

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
      confirmForgotPassword(TestContext, {
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "123456",
        Password: "newPassword",
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("throws if confirmation code doesn't match stored value", async () => {
    const user = TDB.user({
      ConfirmationCode: "456789",
      UserStatus: "UNCONFIRMED",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      confirmForgotPassword(TestContext, {
        ClientId: "clientId",
        Username: "janice",
        ConfirmationCode: "123456",
        Password: "newPassword",
      }),
    ).rejects.toBeInstanceOf(CodeMismatchError);
  });

  describe("when code matches", () => {
    it("updates the user's password", async () => {
      const user = TDB.user({
        ConfirmationCode: "456789",
        UserStatus: "UNCONFIRMED",
      });

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      // advance the time so we can see the last modified timestamp change
      const newNow = clock.advanceBy(5000);

      await confirmForgotPassword(TestContext, {
        ClientId: "clientId",
        Username: user.Username,
        ConfirmationCode: "456789",
        Password: "newPassword",
      });

      expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
        ...user,
        ConfirmationCode: undefined,
        Password: "newPassword",
        UserLastModifiedDate: newNow,
        UserStatus: "CONFIRMED",
      });
    });

    describe("when PostConfirmation trigger configured", () => {
      it("invokes the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(true);

        const user = TDB.user({
          ConfirmationCode: "456789",
          UserStatus: "UNCONFIRMED",
        });

        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await confirmForgotPassword(TestContext, {
          ClientId: "clientId",
          ClientMetadata: {
            client: "metadata",
          },
          Username: user.Username,
          ConfirmationCode: "456789",
          Password: "newPassword",
        });

        expect(mockTriggers.postConfirmation).toHaveBeenCalledWith(
          TestContext,
          {
            clientId: "clientId",
            clientMetadata: {
              client: "metadata",
            },
            source: "PostConfirmation_ConfirmForgotPassword",
            userAttributes: attributesAppend(
              user.Attributes,
              attribute("cognito:user_status", "CONFIRMED"),
            ),
            userPoolId: "test",
            username: user.Username,
          },
        );
      });
    });

    describe("when PostConfirmation trigger not configured", () => {
      it("doesn't invoke the trigger", async () => {
        mockTriggers.enabled.mockReturnValue(false);

        const user = TDB.user({
          ConfirmationCode: "456789",
          UserStatus: "UNCONFIRMED",
        });

        mockUserPoolService.getUserByUsername.mockResolvedValue(user);

        await confirmForgotPassword(TestContext, {
          ClientId: "clientId",
          Username: user.Username,
          ConfirmationCode: "456789",
          Password: "newPassword",
        });

        expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
      });
    });
  });
});
