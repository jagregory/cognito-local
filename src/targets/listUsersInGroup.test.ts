import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { GroupNotFoundError, UserNotFoundError } from "../errors";
import { UserPoolService } from "../services";
import { ListUsersInGroup, ListUsersInGroupTarget } from "./listUsersInGroup";

describe("ListUsersInGroup target", () => {
  let listUsersInGroup: ListUsersInGroupTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();

    listUsersInGroup = ListUsersInGroup({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("lists users in a group", async () => {
    const existingUser1 = TDB.user();
    const existingUser2 = TDB.user();
    const existingGroup = TDB.group({
      members: [existingUser1.Username, existingUser2.Username],
    });

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);
    mockUserPoolService.getUserByUsername.mockImplementation(
      (ctx, username) => {
        if (username === existingUser1.Username) {
          return Promise.resolve(existingUser1);
        } else if (username === existingUser2.Username) {
          return Promise.resolve(existingUser2);
        }
        return Promise.resolve(null);
      }
    );

    const result = await listUsersInGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.getGroupByGroupName).toHaveBeenCalledWith(
      TestContext,
      existingGroup.GroupName
    );

    expect(result.Users).toEqual([
      {
        Attributes: existingUser1.Attributes,
        Enabled: existingUser1.Enabled,
        MFAOptions: existingUser1.MFAOptions,
        UserCreateDate: existingUser1.UserCreateDate,
        UserLastModifiedDate: existingUser1.UserLastModifiedDate,
        UserStatus: existingUser1.UserStatus,
        Username: existingUser1.Username,
      },
      {
        Attributes: existingUser2.Attributes,
        Enabled: existingUser2.Enabled,
        MFAOptions: existingUser2.MFAOptions,
        UserCreateDate: existingUser2.UserCreateDate,
        UserLastModifiedDate: existingUser2.UserLastModifiedDate,
        UserStatus: existingUser2.UserStatus,
        Username: existingUser2.Username,
      },
    ]);
  });

  it("lists users in an empty group", async () => {
    const existingGroup = TDB.group();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);

    const result = await listUsersInGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.getGroupByGroupName).toHaveBeenCalledWith(
      TestContext,
      existingGroup.GroupName
    );

    expect(result.Users).toHaveLength(0);
  });

  it("throws if the group doesn't exist", async () => {
    mockUserPoolService.getGroupByGroupName.mockResolvedValue(null);

    await expect(
      listUsersInGroup(TestContext, {
        GroupName: "group",
        UserPoolId: "test",
      })
    ).rejects.toEqual(new GroupNotFoundError());
  });

  it("throws if any of the users in the group don't exist", async () => {
    const existingUser1 = TDB.user();
    const existingUser2 = TDB.user();
    const existingGroup = TDB.group({
      members: [existingUser1.Username, existingUser2.Username],
    });

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);
    mockUserPoolService.getUserByUsername.mockImplementation(
      (ctx, username) => {
        if (username === existingUser1.Username) {
          return Promise.resolve(existingUser1);
        }
        // don't ever return a value for existingUser2
        return Promise.resolve(null);
      }
    );

    await expect(
      listUsersInGroup(TestContext, {
        GroupName: existingGroup.GroupName,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError());
  });
});
