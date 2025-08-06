import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import {
  AdminSetUserPassword,
  type AdminSetUserPasswordTarget,
} from "./adminSetUserPassword";

describe("AdminSetUser target", () => {
  let adminSetUserPassword: AdminSetUserPasswordTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(new Date());
    adminSetUserPassword = AdminSetUserPassword({
      cognito: newMockCognitoService(mockUserPoolService),
      clock,
    });
  });

  it("sets a new temporary password by default", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword(TestContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate,
      UserStatus: "FORCE_CHANGE_PASSWORD",
    });
  });

  it("sets a new temporary password explicitly", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword(TestContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
      Permanent: false,
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate,
      UserStatus: "FORCE_CHANGE_PASSWORD",
    });
  });

  it("sets a permanent temporary password", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = clock.advanceBy(1200);

    await adminSetUserPassword(TestContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
      Password: "newPassword",
      Permanent: true,
    });

    expect(mockUserPoolService.saveUser).toHaveBeenCalledWith(TestContext, {
      ...existingUser,
      Password: "newPassword",
      UserLastModifiedDate: newDate,
      UserStatus: "CONFIRMED",
    });
  });

  it("handles trying to set a password for an invalid user", async () => {
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminSetUserPassword(TestContext, {
        Password: "Password",
        Username: "Username",
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
