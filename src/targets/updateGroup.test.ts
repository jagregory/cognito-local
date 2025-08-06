import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { GroupNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import { UpdateGroup, type UpdateGroupTarget } from "./updateGroup";

const originalDate = new Date();

describe("UpdateGroup target", () => {
  let updateGroup: UpdateGroupTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;
  let clock: ClockFake;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    clock = new ClockFake(originalDate);

    updateGroup = UpdateGroup({
      clock,
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("updates a group", async () => {
    const existingGroup = TDB.group();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);

    const newDate = new Date();
    clock.advanceTo(new Date());

    const result = await updateGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      RoleArn: "a new arn",
      Precedence: 10,
      Description: "a new description",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.getGroupByGroupName).toHaveBeenCalledWith(
      TestContext,
      existingGroup.GroupName,
    );

    expect(mockUserPoolService.saveGroup).toHaveBeenCalledWith(TestContext, {
      ...existingGroup,
      LastModifiedDate: newDate,
      RoleArn: "a new arn",
      Precedence: 10,
      Description: "a new description",
    });

    expect(result.Group).toEqual({
      CreationDate: existingGroup.CreationDate,
      Description: "a new description",
      GroupName: existingGroup.GroupName,
      LastModifiedDate: newDate,
      Precedence: 10,
      RoleArn: "a new arn",
      UserPoolId: "test",
    });
  });

  it("can do partial updates of group attributes", async () => {
    const existingGroup = TDB.group({
      Description: "old description",
      Precedence: 5,
      RoleArn: "old role arn",
    });

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);

    const newDate = new Date();
    clock.advanceTo(new Date());

    const result = await updateGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      Precedence: 10,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.getGroupByGroupName).toHaveBeenCalledWith(
      TestContext,
      existingGroup.GroupName,
    );

    expect(mockUserPoolService.saveGroup).toHaveBeenCalledWith(TestContext, {
      ...existingGroup,
      LastModifiedDate: newDate,
      Precedence: 10,
    });

    expect(result.Group).toEqual({
      CreationDate: existingGroup.CreationDate,
      Description: existingGroup.Description,
      GroupName: existingGroup.GroupName,
      LastModifiedDate: newDate,
      Precedence: 10,
      RoleArn: existingGroup.RoleArn,
      UserPoolId: "test",
    });
  });

  it("throws if the group doesn't exist", async () => {
    mockUserPoolService.getGroupByGroupName.mockResolvedValue(null);

    await expect(
      updateGroup(TestContext, {
        GroupName: "group",
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new GroupNotFoundError());
  });
});
