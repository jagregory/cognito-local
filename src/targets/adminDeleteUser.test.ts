import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import { AdminDeleteUser, type AdminDeleteUserTarget } from "./adminDeleteUser";

describe("AdminDeleteUser target", () => {
  let adminDeleteUser: AdminDeleteUserTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    adminDeleteUser = AdminDeleteUser({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("deletes the user", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await adminDeleteUser(TestContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.deleteUser).toHaveBeenCalledWith(
      TestContext,
      existingUser,
    );
  });

  it("handles trying to delete an invalid user", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminDeleteUser(TestContext, {
        Username: existingUser.Username,
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
