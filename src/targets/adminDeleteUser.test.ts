import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UserNotFoundError } from "../errors";
import { CognitoClient } from "../services";
import { AdminDeleteUser, AdminDeleteUserTarget } from "./adminDeleteUser";
import * as TDB from "../__tests__/testDataBuilder";

describe("AdminDeleteUser target", () => {
  let adminDeleteUser: AdminDeleteUserTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;

  beforeEach(() => {
    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };

    adminDeleteUser = AdminDeleteUser({
      cognitoClient: mockCognitoClient,
    });
  });

  it("deletes the user", async () => {
    const existingUser = TDB.user();

    MockUserPoolClient.getUserByUsername.mockResolvedValue(existingUser);

    await adminDeleteUser({
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(MockUserPoolClient.deleteUser).toHaveBeenCalledWith(existingUser);
  });

  it("handles trying to delete an invalid user", async () => {
    const existingUser = TDB.user();

    MockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminDeleteUser({
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
