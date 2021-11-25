import { ClockFake } from "../__tests__/clockFake";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UUID } from "../__tests__/patterns";
import { CognitoClient } from "../services";
import { AdminCreateUser, AdminCreateUserTarget } from "./adminCreateUser";

describe("AdminCreateUser target", () => {
  let adminCreateUser: AdminCreateUserTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);

    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };

    adminCreateUser = AdminCreateUser({
      cognitoClient: mockCognitoClient,
      clock: new ClockFake(now),
    });
  });

  it("saves a new user with a provided temporary password", async () => {
    await adminCreateUser({
      TemporaryPassword: "pwd",
      UserAttributes: [{ Name: "email", Value: "example@example.com" }],
      Username: "user-supplied",
      UserPoolId: "test",
    });

    expect(MockUserPoolClient.saveUser).toHaveBeenCalledWith({
      Attributes: [
        {
          Name: "sub",
          Value: expect.stringMatching(UUID),
        },
        { Name: "email", Value: "example@example.com" },
      ],
      Enabled: true,
      Password: "pwd",
      UserCreateDate: now.getTime(),
      UserLastModifiedDate: now.getTime(),
      UserStatus: "FORCE_CHANGE_PASSWORD",
      Username: "user-supplied",
    });
  });

  it.todo("can create an alias to an existing user");
  it.todo("can resend the welcome message");
  it.todo("can suppress the welcome message");
  it.todo("handles creating a duplicate user");
  it.todo("invokes the PreSignIn lambda");
  it.todo("saves a user with a generated temporary password");
  it.todo("sends a welcome message to the user");
});
