import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import { UserNotFoundError } from "../errors";
import { UserPoolService } from "../services";
import { AdminGetUser, AdminGetUserTarget } from "./adminGetUser";
import { MockUser } from "../mocks/MockUser";

describe("AdminGetUser target", () => {
  let adminGetUser: AdminGetUserTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    adminGetUser = AdminGetUser({
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("gets the user", async () => {
    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const result = await adminGetUser(MockContext, {
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(result).toEqual({
      Enabled: existingUser.Enabled,
      UserAttributes: existingUser.Attributes,
      UserCreateDate: new Date(existingUser.UserCreateDate),
      UserLastModifiedDate: new Date(existingUser.UserLastModifiedDate),
      Username: existingUser.Username,
      UserStatus: existingUser.UserStatus,
    });
  });

  it("handles trying to get an invalid user", async () => {
    const existingUser = MockUser();

    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminGetUser(MockContext, {
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
