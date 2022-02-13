import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { UserPoolService } from "../services";
import { ListUsers, ListUsersTarget } from "./listUsers";
import { MockUser } from "../models/UserModel";

describe("ListUsers target", () => {
  let listUsers: ListUsersTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    listUsers = ListUsers({
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("lists users and removes Cognito Local fields", async () => {
    const user1 = MockUser();
    const user2 = MockUser();

    mockUserPoolService.listUsers.mockResolvedValue([user1, user2]);

    const output = await listUsers(MockContext, {
      UserPoolId: "userPoolId",
    });

    expect(output).toBeDefined();
    expect(output.Users).toEqual([
      {
        Attributes: user1.Attributes,
        Enabled: user1.Enabled,
        UserCreateDate: new Date(user1.UserCreateDate),
        UserLastModifiedDate: new Date(user1.UserLastModifiedDate),
        UserStatus: user1.UserStatus,
        Username: user1.Username,
      },
      {
        Attributes: user2.Attributes,
        Enabled: user2.Enabled,
        UserCreateDate: new Date(user2.UserCreateDate),
        UserLastModifiedDate: new Date(user2.UserLastModifiedDate),
        UserStatus: user2.UserStatus,
        Username: user2.Username,
      },
    ]);
  });

  it.todo("supports AttributesToGet to specify which attributes to return");
  it.todo("supports Filter to filter users before returning");
  it.todo("supports Limit to specify the number of users to return");
  it.todo("supports PaginationToken to paginate results");
});
