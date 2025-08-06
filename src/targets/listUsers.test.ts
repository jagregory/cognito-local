import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { UserPoolService } from "../services";
import { ListUsers, type ListUsersTarget } from "./listUsers";

describe("ListUsers target", () => {
  let listUsers: ListUsersTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    listUsers = ListUsers({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("lists users and removes Cognito Local fields", async () => {
    const user1 = TDB.user();
    const user2 = TDB.user();

    mockUserPoolService.listUsers.mockResolvedValue([user1, user2]);

    const output = await listUsers(TestContext, {
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

  it("supports Filter to filter users before returning", async () => {
    mockUserPoolService.listUsers.mockResolvedValue([]);

    const output = await listUsers(TestContext, {
      UserPoolId: "userPoolId",
      Filter: 'username = "abc"',
    });

    expect(output).toBeDefined();
    expect(output.Users).toEqual([]);

    expect(mockUserPoolService.listUsers).toHaveBeenCalledWith(
      TestContext,
      'username = "abc"',
    );
  });

  it.todo("supports Limit to specify the number of users to return");
  it.todo("supports PaginationToken to paginate results");
});
