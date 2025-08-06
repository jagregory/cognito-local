import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockTriggers } from "../__tests__/mockTriggers";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { NotAuthorizedError } from "../errors";
import type { Triggers, UserPoolService } from "../services";
import { attribute, attributesAppend } from "../services/userPoolService";
import {
  AdminConfirmSignUp,
  type AdminConfirmSignUpTarget,
} from "./adminConfirmSignUp";

const currentDate = new Date();

const clock = new ClockFake(currentDate);

describe("AdminConfirmSignUp target", () => {
  let adminConfirmSignUp: AdminConfirmSignUpTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let mockTriggers: MockedObject<Triggers>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    mockTriggers = newMockTriggers();
    adminConfirmSignUp = AdminConfirmSignUp({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
      triggers: mockTriggers,
    });
  });

  it("throws if the user doesn't exist", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminConfirmSignUp(TestContext, {
        ClientMetadata: {
          client: "metadata",
        },
        Username: "invalid user",
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new NotAuthorizedError());
  });

  it.each([
    "CONFIRMED",
    "ARCHIVED",
    "COMPROMISED",
    "UNKNOWN",
    "RESET_REQUIRED",
    "FORCE_CHANGE_PASSWORD",
    "something else",
  ])("throws if the user has status %s", async (status) => {
    const user = TDB.user({
      UserStatus: status,
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await expect(
      adminConfirmSignUp(TestContext, {
        ClientMetadata: {
          client: "metadata",
        },
        Username: user.Username,
        UserPoolId: "test",
      }),
    ).rejects.toEqual(
      new NotAuthorizedError(
        `User cannot be confirmed. Current status is ${status}`,
      ),
    );
  });

  it("updates the user's status", async () => {
    const user = TDB.user({
      UserStatus: "UNCONFIRMED",
    });

    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    await adminConfirmSignUp(TestContext, {
      ClientMetadata: {
        client: "metadata",
      },
      Username: user.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      UserLastModifiedDate: currentDate,
      UserStatus: "CONFIRMED",
    });
  });

  describe("when PostConfirmation trigger is enabled", () => {
    it("invokes the trigger", async () => {
      mockTriggers.enabled.mockImplementation(
        (trigger) => trigger === "PostConfirmation",
      );

      const user = TDB.user({
        UserStatus: "UNCONFIRMED",
      });

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await adminConfirmSignUp(TestContext, {
        ClientMetadata: {
          client: "metadata",
        },
        Username: user.Username,
        UserPoolId: "test",
      });

      expect(mockTriggers.postConfirmation).toHaveBeenCalledWith(TestContext, {
        clientId: null,
        clientMetadata: {
          client: "metadata",
        },
        source: "PostConfirmation_ConfirmSignUp",
        userAttributes: attributesAppend(
          user.Attributes,
          attribute("cognito:user_status", "CONFIRMED"),
        ),
        userPoolId: "test",
        username: user.Username,
      });
    });
  });

  describe("when PostConfirmation trigger is not enabled", () => {
    it("invokes the trigger", async () => {
      mockTriggers.enabled.mockReturnValue(false);

      const user = TDB.user({
        UserStatus: "UNCONFIRMED",
      });

      mockUserPoolService.getUserByUsername.mockResolvedValue(user);

      await adminConfirmSignUp(TestContext, {
        ClientMetadata: {
          client: "metadata",
        },
        Username: user.Username,
        UserPoolId: "test",
      });

      expect(mockTriggers.postConfirmation).not.toHaveBeenCalled();
    });
  });
});
