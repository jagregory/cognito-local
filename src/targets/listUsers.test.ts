import { advanceTo } from "jest-date-mock";
import { CognitoClient, UserPoolClient } from "../services";
import { ListUsers, ListUsersTarget } from "./listUsers";

describe("ListUsers target", () => {
  let listUsers: ListUsersTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockUserPoolClient = {
      config: {
        Id: "test",
      },
      createAppClient: jest.fn(),
      getUserByUsername: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCognitoClient = {
      getUserPool: jest.fn().mockResolvedValue(mockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(mockUserPoolClient),
    };

    listUsers = ListUsers({
      cognitoClient: mockCognitoClient,
    });
  });

  it("lists users and removes Cognito Local fields", async () => {
    mockUserPoolClient.listUsers.mockResolvedValue([
      {
        Attributes: [],
        UserStatus: "CONFIRMED",
        Password: "hunter2",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
        ConfirmationCode: "1234",
      },
      {
        Attributes: [],
        UserStatus: "CONFIRMED",
        Password: "password1",
        Username: "1111-1111",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
      },
    ]);

    const output = await listUsers({
      UserPoolId: "userPoolId",
    });

    expect(output).toBeDefined();
    expect(output.Users).toEqual([
      {
        Attributes: [],
        UserStatus: "CONFIRMED",
        Username: "0000-0000",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
      },
      {
        Attributes: [],
        UserStatus: "CONFIRMED",
        Username: "1111-1111",
        Enabled: true,
        UserCreateDate: new Date().getTime(),
        UserLastModifiedDate: new Date().getTime(),
      },
    ]);
  });

  it.todo("supports AttributesToGet to specify which attributes to return");
  it.todo("supports Filter to filter users before returning");
  it.todo("supports Limit to specify the number of users to return");
  it.todo("supports PaginationToken to paginate results");
});
