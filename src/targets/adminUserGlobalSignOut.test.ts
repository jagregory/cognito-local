import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  AdminUserGlobalSignOut,
  type AdminUserGlobalSignOutTarget,
} from "./adminUserGlobalSignOut";

const originalDate = new Date();

describe("AdminUserGlobalSignOut target", () => {
  let adminUserGlobalSignOut: AdminUserGlobalSignOutTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(originalDate);

    adminUserGlobalSignOut = AdminUserGlobalSignOut({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("revokes every refresh token of the user", async () => {
    const existingUser = TDB.user({ RefreshTokens: ["one", "two"] });
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);
    const newDate = new Date();
    clock.advanceTo(newDate);

    await adminUserGlobalSignOut(TestContext, {
      UserPoolId: "test",
      Username: existingUser.Username,
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      RefreshTokens: [],
      UserLastModifiedDate: newDate,
    });
  });

  it("throws if the user doesn't exist", async () => {
    await expect(
      adminUserGlobalSignOut(TestContext, {
        UserPoolId: "test",
        Username: "user",
      }),
    ).rejects.toEqual(new UserNotFoundError());
  });
});
