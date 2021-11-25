import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UUID } from "../__tests__/patterns";
import * as TDB from "../__tests__/testDataBuilder";
import { UsernameExistsError } from "../errors";
import { UserPoolClient } from "../services";
import { AdminCreateUser, AdminCreateUserTarget } from "./adminCreateUser";

const originalDate = new Date();

describe("AdminCreateUser target", () => {
  let adminCreateUser: AdminCreateUserTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    adminCreateUser = AdminCreateUser({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
      clock: new ClockFake(originalDate),
    });
  });

  it("saves a new user with a provided temporary password", async () => {
    await adminCreateUser({
      TemporaryPassword: "pwd",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(mockUserPoolClient.saveUser).toHaveBeenCalledWith({
      Attributes: [
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
        { Name: "email", Value: "example@example.com" },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: originalDate.getTime(),
      UserLastModifiedDate: originalDate.getTime(),
      UserStatus: "FORCE_CHANGE_PASSWORD",
      Username: "user-supplied",
    });
  });

  it.todo("can create an alias to an existing user");
  it.todo("can resend the welcome message");
  it.todo("can suppress the welcome message");

  it("handles creating a duplicate user", async () => {
    const existingUser = TDB.user();
    mockUserPoolClient.getUserByUsername.mockResolvedValue(existingUser);

    await expect(
      adminCreateUser({
        TemporaryPassword: "pwd",
        UserAttributes: existingUser.Attributes,
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UsernameExistsError());
  });

  it.todo("invokes the PreSignIn lambda");
  it.todo("saves a user with a generated temporary password");
  it.todo("sends a welcome message to the user");
});
