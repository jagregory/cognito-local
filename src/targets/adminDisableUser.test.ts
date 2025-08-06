import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  AdminDisableUser,
  type AdminDisableUserTarget,
} from "./adminDisableUser";

const originalDate = new Date();

describe("AdminDisableUser target", () => {
  let adminDisableUser: AdminDisableUserTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(originalDate);

    adminDisableUser = AdminDisableUser({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("enables the user", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = new Date();
    clock.advanceTo(newDate);

    await adminDisableUser(TestContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      UserLastModifiedDate: newDate,
      Enabled: false,
    });
  });

  it("throws if the user doesn't exist", async () => {
    await expect(
      adminDisableUser(TestContext, {
        Username: "user",
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new UserNotFoundError());
  });
});
