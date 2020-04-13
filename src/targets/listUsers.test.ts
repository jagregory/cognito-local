import { advanceTo } from "jest-date-mock";
import { UserPool } from "../services";
import { Triggers } from "../services/triggers";
import { ListUsers, ListUsersTarget } from "./listUsers";

describe("ListUsers target", () => {
  let listUsers: ListUsersTarget;
  let mockDataStore: jest.Mocked<UserPool>;
  let mockCodeDelivery: jest.Mock;
  let mockTriggers: jest.Mocked<Triggers>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockDataStore = {
      getUserByUsername: jest.fn(),
      getUserPoolIdForClientId: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCodeDelivery = jest.fn();
    mockTriggers = {
      enabled: jest.fn(),
      postConfirmation: jest.fn(),
      userMigration: jest.fn(),
    };

    listUsers = ListUsers({
      userPool: mockDataStore,
      codeDelivery: mockCodeDelivery,
      triggers: mockTriggers,
    });
  });

  it.todo("should validate UserPoolId parameter");

  it("lists users and removes Cognito Local fields", async () => {
    mockDataStore.listUsers.mockResolvedValue([
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
