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

const currentDate = new Date();

describe("AdminUserGlobalSignOut target", () => {
  let adminUserGlobalSignOut: AdminUserGlobalSignOutTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    adminUserGlobalSignOut = AdminUserGlobalSignOut({
      cognito: newMockCognitoService(mockUserPoolService),
      clock: new ClockFake(currentDate),
    });
  });

  it("clears RefreshTokens for the user", async () => {
    const user = TDB.user({
      Username: "testuser",
      RefreshTokens: ["token1", "token2"],
    });
    mockUserPoolService.getUserByUsername.mockResolvedValue(user);

    const result = await adminUserGlobalSignOut(TestContext, {
      UserPoolId: "test",
      Username: "testuser",
    });

    expect(result).toEqual({});
    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...user,
      RefreshTokens: [],
      UserLastModifiedDate: currentDate,
    });
  });

  it("throws if user not found", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminUserGlobalSignOut(TestContext, {
        UserPoolId: "test",
        Username: "unknown",
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);

    expect(mockUserPoolService.saveUser).not.toHaveBeenCalled();
  });
});
