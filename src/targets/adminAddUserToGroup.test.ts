import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { GroupNotFoundError, UserNotFoundError } from "../errors";
import { UserPoolService } from "../services";
import {
  AdminAddUserToGroup,
  AdminAddUserToGroupTarget,
} from "./adminAddUserToGroup";

const originalDate = new Date();

describe("AdminAddUserToGroup target", () => {
  let adminAddUserToGroup: AdminAddUserToGroupTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(originalDate);

    adminAddUserToGroup = AdminAddUserToGroup({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("adds the user to a group", async () => {
    const existingGroup = TDB.group();
    const existingUser = TDB.user();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = new Date();
    clock.advanceTo(newDate);

    await adminAddUserToGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveGroup).toHaveBeenCalledWith(TestContext, {
      ...existingGroup,
      LastModifiedDate: newDate,
      members: [existingUser.Username],
    });
  });

  it("adds the user to a group only once", async () => {
    const existingGroup = TDB.group();
    const existingUser = TDB.user();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    const newDate = new Date();
    clock.advanceTo(newDate);

    await adminAddUserToGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    // try add a second time
    await adminAddUserToGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      Username: existingUser.Username,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveGroup).toHaveBeenCalledWith(TestContext, {
      ...existingGroup,
      LastModifiedDate: newDate,
      members: [existingUser.Username],
    });
  });

  it("throws if the group doesn't exist", async () => {
    const existingUser = TDB.user();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(null);
    mockUserPoolService.getUserByUsername.mockResolvedValue(existingUser);

    await expect(
      adminAddUserToGroup(TestContext, {
        GroupName: "group",
        Username: existingUser.Username,
        UserPoolId: "test",
      })
    ).rejects.toEqual(new GroupNotFoundError());
  });

  it("throws if the user doesn't exist", async () => {
    const existingGroup = TDB.group();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);
    mockUserPoolService.getUserByUsername.mockResolvedValue(null);

    await expect(
      adminAddUserToGroup(TestContext, {
        GroupName: existingGroup.GroupName,
        Username: "user",
        UserPoolId: "test",
      })
    ).rejects.toEqual(new UserNotFoundError());
  });
});
