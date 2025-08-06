import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { GroupNotFoundError } from "../errors";
import type { UserPoolService } from "../services";
import { DeleteGroup, type DeleteGroupTarget } from "./deleteGroup";

describe("DeleteGroup target", () => {
  let deleteGroup: DeleteGroupTarget;
  let mockUserPoolService: MockedObject<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();

    deleteGroup = DeleteGroup({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("deletes a group", async () => {
    const existingGroup = TDB.group();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);

    await deleteGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.deleteGroup).toHaveBeenCalledWith(
      TestContext,
      existingGroup,
    );
  });

  it("throws if the group doesn't exist", async () => {
    mockUserPoolService.getGroupByGroupName.mockResolvedValue(null);

    await expect(
      deleteGroup(TestContext, {
        GroupName: "group",
        UserPoolId: "test",
      }),
    ).rejects.toEqual(new GroupNotFoundError());
  });
});
