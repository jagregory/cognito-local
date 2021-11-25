import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UserNotFoundError } from "../errors";
import { CognitoClient } from "../services";
import { AdminGetUser, AdminGetUserTarget } from "./adminGetUser";
import * as TDB from "../__tests__/testDataBuilder";

describe("AdminGetUser target", () => {
  let adminGetUser: AdminGetUserTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;

  beforeEach(() => {
    mockCognitoClient = newMockCognitoClient();

    adminGetUser = AdminGetUser({
      cognitoClient: mockCognitoClient,
    });
  });

  it("gets the user", async () => {
    const existingUser = TDB.user();

    MockUserPoolClient.getUserByUsername.mockResolvedValue(existingUser);

    const result = await adminGetUser({
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
    const existingUser = TDB.user();

    MockUserPoolClient.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminGetUser({
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError("User does not exist"));
  });
});
