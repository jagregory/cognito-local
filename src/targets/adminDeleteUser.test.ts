import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import { UserNotFoundError } from "../errors";
import { UserPoolService } from "../services";
import { AdminDeleteUser, AdminDeleteUserTarget } from "./adminDeleteUser";
import { MockUser } from "../mocks/MockUser";

describe("AdminDeleteUser target", () => {
  let adminDeleteUser: AdminDeleteUserTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    adminDeleteUser = AdminDeleteUser({
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("deletes the user", async () => {
    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await adminDeleteUser(MockContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.deleteUser).toHaveBeenCalledWith(
      MockContext,
      existingUser
    );
  });

  it("handles trying to delete an invalid user", async () => {
    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminDeleteUser(MockContext, {
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
