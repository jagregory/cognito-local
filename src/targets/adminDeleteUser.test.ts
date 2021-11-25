import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import * as TDB from "../__tests__/testDataBuilder";
import { UserNotFoundError } from "../errors";
import { UserPoolClient } from "../services";
import { AdminDeleteUser, AdminDeleteUserTarget } from "./adminDeleteUser";

describe("AdminDeleteUser target", () => {
  let adminDeleteUser: AdminDeleteUserTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    adminDeleteUser = AdminDeleteUser({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
    });
  });

  it("deletes the user", async () => {
    const existingUser = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(existingUser);

    await adminDeleteUser({
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolClient.deleteUser).toHaveBeenCalledWith(existingUser);
  });

  it("handles trying to delete an invalid user", async () => {
    const existingUser = TDB.user();

    mockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminDeleteUser({
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
