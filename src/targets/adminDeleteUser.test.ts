import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import { UserPoolService } from "../services";
import { AdminDeleteUser, AdminDeleteUserTarget } from "./adminDeleteUser";

describe("AdminDeleteUser target", () => {
  let adminDeleteUser: AdminDeleteUserTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    adminDeleteUser = AdminDeleteUser({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("deletes the user", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await adminDeleteUser({
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.deleteUser).toHaveBeenCalledWith(existingUser);
  });

  it("handles trying to delete an invalid user", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminDeleteUser({
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
